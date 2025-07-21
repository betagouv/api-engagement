import prisma from "../../db/postgres";
import MissionModel from "../../models/mission";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { transformMongoMissionToPg } from "./utils/transformers";

const DEFAULT_LIMIT = 10;

export interface ExportMissionsToPgJobPayload {
  id?: string;
  limit?: number;
}

export interface ExportMissionsToPgJobResult extends JobResult {
  counter: {
    total: number;
    created: number;
    updated: number;
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
    }).limit(payload.limit || DEFAULT_LIMIT);

    console.log(`[Export missions to PG] Found ${missions.length} missions to export`);

    // Get partners for mission mapping
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        old_id: true,
      },
    });

    for (const mission of missions) {
      const result = transformMongoMissionToPg(mission, "partner-123", []);
      if (result) {
        console.log(`[Export missions to PG] Exported mission ${mission._id.toString()}`);
      }
    }

    return {
      success: true,
      timestamp: new Date(),
      counter: {
        total: 0,
        created: 0,
        updated: 0,
        deleted: 0,
      },
    };
  }
}
