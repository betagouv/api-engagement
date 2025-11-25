import { MissionEventType, Prisma } from "../db/core";

export type MissionEventCreateParams = {
  missionId: string;
  type: MissionEventType;
  changes?: Record<string, { previous: any; current: any }> | Prisma.JsonValue | null;
  createdBy?: string | null;
};

export type MissionEventRecord = {
  id: string;
  missionId: string;
  type: MissionEventType;
  changes: Prisma.JsonValue | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
};
