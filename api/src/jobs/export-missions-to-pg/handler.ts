import { Address, MissionHistoryEvent } from "@prisma/client";
import prisma from "../../db/postgres";
import MissionModel from "../../models/mission";
import { BaseHandler } from "../base/handler";
import { ExportMissionsToPgJobPayload, ExportMissionsToPgJobResult } from "./types";
import { getMongoMissionsToSync, getOrganizationsFromMissions } from "./utils/helpers";
import { transformMongoMissionToPg } from "./utils/transformers";

const PG_CHUNK_SIZE = 100;

export class ExportMissionsToPgHandler implements BaseHandler<ExportMissionsToPgJobPayload, ExportMissionsToPgJobResult> {
  name = "Export des missions vers PG";

  async handle(payload: ExportMissionsToPgJobPayload): Promise<ExportMissionsToPgJobResult> {
    const start = new Date();
    console.log(`[Export missions to PG] Starting at ${start.toISOString()}`);

    const missions = await getMongoMissionsToSync(payload);
    console.log(`[Export missions to PG] Found ${missions.length} missions to sync`);

    // Get partners for mission mapping
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        old_id: true,
      },
    });
    console.log(`[Export missions to PG] Found ${partners.length} partners`);

    const counter = {
      total: 0,
      processed: 0,
      error: 0,
      deleted: 0,
    };

    for (let i = 0; i < missions.length; i += PG_CHUNK_SIZE) {
      const batch = missions.slice(i, i + PG_CHUNK_SIZE);
      console.log(`[Export missions to PG] Batch ${i / PG_CHUNK_SIZE + 1} / ${Math.ceil(missions.length / PG_CHUNK_SIZE)} (${batch.length} missions)`);

      const organizations = await getOrganizationsFromMissions(batch);
      console.log(`[Export missions to PG] Found ${organizations.length} organizations related to missions`);

      const missionsIds: string[] = [];
      const addressesToCreate: Omit<Address, "id">[] = [];
      const historyToCreate: Omit<MissionHistoryEvent, "id">[] = [];

      for (const mission of batch) {
        counter.total++;

        const partner = partners.find((p) => p.old_id === mission.publisherId);
        if (!partner) {
          console.error(`[Export missions to PG] No partner found for mission ${mission._id?.toString()} (${mission.publisherId})`);
          counter.error++;
          continue;
        }
        const organization = organizations.find((o) => o.old_id === mission.organizationId);
        const result = transformMongoMissionToPg(mission, partner.id, organization?.id);
        if (result) {
          try {
            const upsert = await prisma.mission.upsert({
              where: { old_id: result.mission.old_id },
              update: result.mission,
              create: result.mission,
            });
            counter.processed++;
            missionsIds.push(upsert.id);
            addressesToCreate.push(...result.addresses.map((a) => ({ ...a, mission_id: upsert.id })));
            historyToCreate.push(...result.history.map((h) => ({ ...h, mission_id: upsert.id })));
          } catch (error) {
            console.error(`Error processing mission ${mission._id?.toString()}: ${error}`);
            counter.error++;
          }
        } else {
          console.error(`[Export missions to PG] Error converting mission ${mission._id?.toString()}`);
          counter.error++;
        }
      }
      try {
        if (missionsIds.length > 0) {
          await prisma.address.deleteMany({ where: { mission_id: { in: missionsIds } } });
          if (addressesToCreate.length > 0) {
            await prisma.address.createMany({ data: addressesToCreate });
          }
          await prisma.missionHistoryEvent.deleteMany({ where: { mission_id: { in: missionsIds } } });
          if (historyToCreate.length > 0) {
            await prisma.missionHistoryEvent.createMany({ data: historyToCreate });
          }
          console.log(`[Export missions to PG] Updated addresses and history for ${missionsIds.length} missions (batch)`);
        }
      } catch (error) {
        console.error(`[Export missions to PG] Error while updating addresses and history for ${missionsIds.length} missions (batch): ${error}`);
      }

      // Update missions lastExportedToPgAt to exclude them to be processed again
      // Timestamps are disabled to avoid updating updatedAt
      await MissionModel.updateMany({ _id: { $in: batch.map((m) => m._id) } }, { $set: { lastExportedToPgAt: new Date() } }, { timestamps: false });
      console.log(`[Export missions to PG] Updated lastExportedToPgAt for ${batch.length} missions (batch)`);
    }

    return {
      success: true,
      timestamp: new Date(),
      counter,
      message: `\t• Nombre de missions traitées: ${counter.total}\n\t• Nombre de missions traitées avec succès: ${counter.processed}\n\t• Nombre de missions en erreur: ${counter.error}\n\t• Nombre de missions supprimées: ${counter.deleted}`,
    };
  }
}
