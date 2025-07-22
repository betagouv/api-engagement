import { MissionHistoryEvent, Address as PgAddress, Mission as PgMission } from "@prisma/client";

export type MissionHistoryEntry = Omit<MissionHistoryEvent, "id">; // Prisma renders uuid when saving

export type MissionTransformResult = {
  mission: PgMission;
  addresses: PgAddress[];
  history: MissionHistoryEntry[];
};
