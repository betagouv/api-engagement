import { Address, MissionHistoryEvent } from "@prisma/client";
import prisma from "../../db/postgres";
import MissionModel from "../../models/mission";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { transformMongoMissionToPg } from "./utils/transformers";

const PG_CHUNK_SIZE = 100;
const DEFAULT_LIMIT = 1000;
export interface ExportMissionsToPgJobPayload {
  id?: string;
  limit?: number;
}

export interface ExportMissionsToPgJobResult extends JobResult {
  counter: {
    total: number;
    processed: number;
    error: number;
    deleted: number;
  };
}

export class ExportMissionsToPgHandler implements BaseHandler<ExportMissionsToPgJobPayload, ExportMissionsToPgJobResult> {
  async handle(payload: ExportMissionsToPgJobPayload): Promise<ExportMissionsToPgJobResult> {
    const start = new Date();
    console.log(`[Export missions to PG] Starting at ${start.toISOString()}`);

    // Get missions where updated at is greater than the last time they were exported (mission.updatedAt > mission.lastExportedToPgAt)
    const missions = await MissionModel.find({
      $or: [{ lastExportedToPgAt: { $exists: false } }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }],
    })
      .limit(payload.limit || DEFAULT_LIMIT)
      .lean();

    // Get partners for mission mapping
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        old_id: true,
      },
    });
    console.log(`[Export missions to PG] Found ${partners.length} partners`);

    // Extract unique organization IDs from selected missions to find only wanted organizations in PG
    const organizationIds: string[] = [...new Set(missions.map((e) => e.organizationId).filter((e) => e !== undefined))] as string[];
    const organizations = await prisma.organization.findMany({
      where: { old_id: { in: organizationIds } },
    });
    console.log(`[Export missions to PG] Found ${organizations.length} organizations related to missions`);

    const counter = {
      total: 0,
      processed: 0,
      error: 0,
      deleted: 0,
    };

    for (let i = 0; i < missions.length; i += PG_CHUNK_SIZE) {
      const batch = missions.slice(i, i + PG_CHUNK_SIZE);
      console.log(`[Export missions to PG] Traitement du lot ${i / PG_CHUNK_SIZE + 1} (${batch.length} missions)`);

      const missionsIds: string[] = [];
      const addressesToCreate: Omit<Address, "id">[] = [];
      const historyToCreate: Omit<MissionHistoryEvent, "id">[] = [];

      for (const mission of batch) {
        counter.total++;

        const partner = partners.find((p) => p.old_id === mission.publisherId);
        if (!partner) {
          console.log(`[Export missions to PG] No partner found for mission ${mission._id.toString()} (${mission.publisherId})`);
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
            console.log(`[Export missions to PG] Mission ${mission._id.toString()} processed`);
            counter.processed++;
            missionsIds.push(upsert.id);
            addressesToCreate.push(...result.addresses.map((a) => ({ ...a, mission_id: upsert.id })));
            historyToCreate.push(...result.history.map((h) => ({ ...h, mission_id: upsert.id })));
          } catch (error) {
            console.log(`Error processing mission ${mission._id.toString()}: ${error}`);
            counter.error++;
          }
        } else {
          console.log(`[Export missions to PG] Error converting mission ${mission._id.toString()}`);
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
        console.log(`[Export missions to PG] Error while updating addresses and history for ${missionsIds.length} missions (batch): ${error}`);
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
    };
  }
}
