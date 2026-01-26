import { JobBoardId, MissionJobBoard, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import type { MissionJobBoardSyncStatus } from "../types/mission-job-board";

export const missionJobBoardRepository = {
  async findByJobBoardAndMissionIds(jobBoardId: JobBoardId, missionIds: string[]): Promise<MissionJobBoard[]> {
    if (!missionIds.length) {
      return [];
    }
    return prismaCore.missionJobBoard.findMany({
      where: { jobBoardId, missionId: { in: missionIds } },
    });
  },

  async findByJobBoard(jobBoardId: JobBoardId, syncStatus?: MissionJobBoardSyncStatus | null): Promise<MissionJobBoard[]> {
    return prismaCore.missionJobBoard.findMany({
      where: {
        jobBoardId,
        ...(syncStatus ? { syncStatus } : {}),
      },
    });
  },

  async upsert(entry: {
    jobBoardId: JobBoardId;
    missionId: string;
    missionAddressId?: string | null;
    publicId: string;
    syncStatus?: MissionJobBoardSyncStatus | null;
    comment?: string | null;
  }): Promise<MissionJobBoard> {
    const missionAddressId = entry.missionAddressId ?? null;
    // Manually manage upsert when missionAddressId is null to avoid duplicate
    if (missionAddressId === null) {
      const existing = await prismaCore.missionJobBoard.findFirst({
        where: { jobBoardId: entry.jobBoardId, missionId: entry.missionId, missionAddressId: null },
      });
      if (existing) {
        return prismaCore.missionJobBoard.update({
          where: { id: existing.id },
          data: { publicId: entry.publicId, syncStatus: entry.syncStatus ?? null, comment: entry.comment ?? null },
        });
      }
      return prismaCore.missionJobBoard.create({
        data: {
          jobBoardId: entry.jobBoardId,
          missionId: entry.missionId,
          missionAddressId: null,
          publicId: entry.publicId,
          syncStatus: entry.syncStatus ?? null,
          comment: entry.comment ?? null,
        },
      });
    }

    return prismaCore.missionJobBoard.upsert({
      where: {
        jobBoardId_missionId_missionAddressId: {
          jobBoardId: entry.jobBoardId,
          missionId: entry.missionId,
          missionAddressId,
        },
      },
      update: { publicId: entry.publicId, syncStatus: entry.syncStatus ?? null, comment: entry.comment ?? null },
      create: {
        jobBoardId: entry.jobBoardId,
        missionId: entry.missionId,
        missionAddressId,
        publicId: entry.publicId,
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
