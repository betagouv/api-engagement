import { JobBoardId as PrismaJobBoardId } from "../db/core";

export type JobBoardId = PrismaJobBoardId;
export const JOB_BOARD_IDS = PrismaJobBoardId;

export type MissionJobBoardRecord = {
  id: string;
  jobBoardId: JobBoardId;
  missionId: string;
  missionAddressId: string | null;
  publicId: string;
  status: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MissionJobBoardUpsertInput = {
  jobBoardId: JobBoardId;
  missionId: string;
  missionAddressId?: string | null;
  publicId: string;
  status?: string | null;
  comment?: string | null;
};
