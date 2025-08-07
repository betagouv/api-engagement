import { Address as PgAddress, Mission as PgMission } from "@prisma/client";
import { JobResult } from "../types";

export interface ExportMissionsEventToPgJobPayload {}

export interface ExportMissionsEventToPgJobResult extends JobResult {
  counter: {
    processed: number;
    success: number;
    error: number;
  };
}

export type MissionTransformResult = {
  mission: PgMission;
  addresses: PgAddress[];
};
