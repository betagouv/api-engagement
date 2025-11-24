import { Address as PgAddress, Mission as PgMission } from "../../db/analytics";
import { JobResult } from "../types";

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
