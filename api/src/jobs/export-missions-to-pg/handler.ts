import { Prisma } from "../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../db/postgres";
import { captureException } from "../../error";
import MissionModel from "../../models/mission";
import { Mission } from "../../types";
import { BaseHandler } from "../base/handler";
import { ExportMissionsToPgJobPayload, ExportMissionsToPgJobResult } from "./types";
import { countMongoMissionsToSync, getMongoMissionsToSync, getOrganizationsFromMissions } from "./utils/helpers";
import { transformMongoMissionToPg } from "./utils/transformers";

const BULK_SIZE = 10000;
const PG_CHUNK_SIZE = 100;

export class ExportMissionsToPgHandler implements BaseHandler<ExportMissionsToPgJobPayload, ExportMissionsToPgJobResult> {
  name = "Export des missions vers PG";

  async handle(payload: ExportMissionsToPgJobPayload): Promise<ExportMissionsToPgJobResult> {
    const start = new Date();
    console.log(`[Export missions to PG] Starting at ${start.toISOString()}`);

    const counter = await exportMission();
    return {
      success: true,
      timestamp: new Date(),
      counter,
      message: `\t• Nombre de missions traitées: ${counter.processed}\n\t• Nombre de missions traitées avec succès: ${counter.success}\n\t• Nombre de missions en erreur: ${counter.error}\n\t• Nombre de missions supprimées: ${counter.deleted}`,
    };
  }
}

const exportMission = async () => {
  const count = await countMongoMissionsToSync();
  console.log(`[Export missions to PG] Found ${count} missions to sync`);

  const counter = {
    processed: 0,
    success: 0,
    error: 0,
    deleted: 0,
  };

  let prevCount = 0;
  let batchCount = 0;
  while (true) {
    const missions = await getMongoMissionsToSync({ limit: BULK_SIZE });

    if (missions.length === 0 || (missions.length === prevCount && missions.length !== BULK_SIZE)) {
      console.log(`[Export missions to PG] No more missions can be processed (${missions.length} left)`);
      break;
    }

    prevCount = missions.length;

    console.log(`[Export missions to PG] Processing batch ${batchCount + 1} / ${Math.ceil(count / BULK_SIZE)} (${missions.length} missions)`);

    // Get partners for mission mapping
    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    console.log(`[Export missions to PG] Found ${Object.keys(partners).length} partners`);

    for (let i = 0; i < missions.length; i += PG_CHUNK_SIZE) {
      const batch = missions.slice(i, i + PG_CHUNK_SIZE) as Mission[];
      console.log(`[Export missions to PG] Batch ${i / PG_CHUNK_SIZE + 1} / ${Math.ceil(missions.length / PG_CHUNK_SIZE)} (${batch.length} missions)`);

      const organizations = await getOrganizationsFromMissions(batch);
      console.log(`[Export missions to PG] Found ${Object.keys(organizations).length} organizations related to missions`);

      const missionsIds: string[] = [];
      const missionsUpdatedIds: string[] = [];
      const addressesToCreate: Prisma.AddressCreateManyInput[] = [];

      for (const mission of batch) {
        counter.processed++;

        const partner = partners[mission.publisherId];
        if (!partner) {
          console.error(`[Export missions to PG] No partner found for mission ${mission._id?.toString()} (${mission.publisherId})`);
          counter.error++;
          continue;
        }
        const organization = organizations[mission.organizationId || ""];
        const result = transformMongoMissionToPg(mission, partner, organization);
        if (!result) {
          console.error(`[Export missions to PG] Error converting mission ${mission._id?.toString()}`);
          counter.error++;
          continue;
        }
        try {
          const upsert = await prismaClient.mission.upsert({
            where: { old_id: result.mission.old_id },
            update: result.mission,
            create: result.mission,
          });
          counter.success++;
          missionsIds.push(upsert.id);
          missionsUpdatedIds.push(result.mission.old_id);
          addressesToCreate.push(...result.addresses.map((a) => ({ ...a, mission_id: upsert.id })));
        } catch (error) {
          console.error(`[Export missions to PG] Error while upserting mission ${mission._id?.toString()}`);
          captureException(error, { extra: { mission, result } });
          counter.error++;
        }
      }

      try {
        if (missionsIds.length > 0) {
          await prismaClient.address.deleteMany({ where: { mission_id: { in: missionsIds } } });
          if (addressesToCreate.length > 0) {
            await prismaClient.address.createMany({ data: addressesToCreate });
          }
          console.log(`[Export missions to PG] Updated addresses and history for ${missionsIds.length} missions (batch)`);
        }
      } catch (error) {
        console.error(`[Export missions to PG] Error while updating addresses and history for ${missionsIds.length} missions (batch)`);
        captureException(error, { extra: { missionsIds, addressesToCreate } });
      }

      // Update missions lastExportedToPgAt to exclude them to be processed again
      // Timestamps are disabled to avoid updating updatedAt
      await MissionModel.updateMany({ _id: { $in: missionsUpdatedIds } }, { $set: { lastExportedToPgAt: new Date() } }, { timestamps: false });
      missionsUpdatedIds.length = 0;
      console.log(`[Export missions to PG] Updated lastExportedToPgAt for ${batch.length} missions (batch)`);
    }
    batchCount++;
  }

  return counter;
};
