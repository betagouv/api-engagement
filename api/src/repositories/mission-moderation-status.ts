import { MissionModerationStatus, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const missionModerationStatusRepository = {
  create(params: Prisma.MissionModerationStatusCreateArgs): Promise<MissionModerationStatus> {
    return prisma.missionModerationStatus.create({
      ...params,
      include: params.include ?? undefined,
    });
  },

  findUnique(params: Prisma.MissionModerationStatusFindUniqueArgs): Promise<MissionModerationStatus | null> {
    return prisma.missionModerationStatus.findUnique({
      ...params,
      include: params.include ?? undefined,
    });
  },

  findMany(params: Prisma.MissionModerationStatusFindManyArgs = {}): Promise<MissionModerationStatus[]> {
    return prisma.missionModerationStatus.findMany({
      ...params,
      include: params.include ?? undefined,
    });
  },

  update(params: Prisma.MissionModerationStatusUpdateArgs): Promise<MissionModerationStatus> {
    return prisma.missionModerationStatus.update({
      ...params,
      include: params.include ?? undefined,
    });
  },

  updateMany(params: Prisma.MissionModerationStatusUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.missionModerationStatus.updateMany({
      ...params,
    });
  },

  count(where: Prisma.MissionModerationStatusWhereInput = {}): Promise<number> {
    return prisma.missionModerationStatus.count({ where });
  },

  groupBy<K extends keyof MissionModerationStatus>(by: K[], where: Prisma.MissionModerationStatusWhereInput) {
    return prisma.missionModerationStatus.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },

  async upsertMany(inputs: Prisma.MissionModerationStatusUpsertArgs[]): Promise<MissionModerationStatus[]> {
    return prisma.$transaction(inputs.map((input) => prisma.missionModerationStatus.upsert(input)));
  },
};

export default missionModerationStatusRepository;
