import { Prisma } from "../../db/analytics";
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
  missionCreate: Prisma.MissionUncheckedCreateInput;
  missionUpdate: Prisma.MissionUncheckedUpdateInput;
  addresses: Omit<Prisma.AddressCreateManyInput, "mission_id">[];
};
