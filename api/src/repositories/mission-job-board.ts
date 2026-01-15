import { JobBoardId, MissionJobBoard, Prisma } from "../db/core";
import type { MissionJobBoardSyncStatus } from "../types/mission-job-board";
import { prismaCore } from "../db/postgres";

export const missionJobBoardRepository = {
  async findByJobBoardAndMissionIds(jobBoardId: JobBoardId, missionIds: string[]): Promise<MissionJobBoard[]> {
    if (!missionIds.length) {
      return [];
    }
    return prismaCore.missionJobBoard.findMany({
      where: { jobBoardId, missionId: { in: missionIds } },
    });
  },

  async findByJobBoard(jobBoardId: JobBoardId, status?: string): Promise<MissionJobBoard[]> {
    return prismaCore.missionJobBoard.findMany({
      where: {
        jobBoardId,
        ...(status ? { status } : {}),
      },
    });
  },

  async upsert(entry: {
    jobBoardId: JobBoardId;
    missionId: string;
    missionAddressId?: string | null;
    publicId: string;
    status?: string | null;
    syncStatus?: MissionJobBoardSyncStatus | null;
    comment?: string | null;
  }): Promise<MissionJobBoard> {
    const missionAddressId = entry.missionAddressId ?? null;
    return prismaCore.missionJobBoard.upsert({
      where: {
        jobBoardId_missionId_missionAddressId: {
          jobBoardId: entry.jobBoardId,
          missionId: entry.missionId,
          missionAddressId: (missionAddressId ?? "") as string,
        },
      },
      update: { publicId: entry.publicId, status: entry.status ?? null, syncStatus: entry.syncStatus ?? null, comment: entry.comment ?? null },
      create: {
        jobBoardId: entry.jobBoardId,
        missionId: entry.missionId,
        missionAddressId: missionAddressId ?? null,
        publicId: entry.publicId,
        status: entry.status ?? null,
        syncStatus: entry.syncStatus ?? null,
        comment: entry.comment ?? null,
      },
    });
  },

  async createMany(data: Prisma.MissionJobBoardCreateManyInput[]): Promise<Prisma.BatchPayload> {
    if (!data.length) {
      return { count: 0 };
    }
    return prismaCore.missionJobBoard.createMany({ data });
  },

  async deleteForMission(jobBoardId: JobBoardId, missionId: string): Promise<Prisma.BatchPayload> {
    return prismaCore.missionJobBoard.deleteMany({
      where: { jobBoardId, missionId },
    });
  },
};

export default missionJobBoardRepository;
