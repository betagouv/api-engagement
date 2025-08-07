import { MissionHistoryEvent, Address as PgAddress, Mission as PgMission } from "@prisma/client";
import { JobResult } from "../types";

export type MissionHistoryEntry = Omit<MissionHistoryEvent, "id">; // Prisma renders uuid when saving

export interface ExportMissionsToPgJobPayload {
  id?: string;
  limit?: number;
}

export interface ExportMissionsToPgJobResult extends JobResult {
  counter: {
    processed: number;
    success: number;
    error: number;
    deleted: number;
  };
}

export type MissionTransformResult = {
  mission: PgMission;
  addresses: PgAddress[];
};
