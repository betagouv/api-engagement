import { Mission, Prisma } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const missionRepository = {
  async findMany(params: Prisma.MissionFindManyArgs = {}): Promise<Mission[]> {
    return prismaCore.mission.findMany(params);
  },

  async count(where: Prisma.MissionWhereInput = {}): Promise<number> {
    return prismaCore.mission.count({ where });
  },

  async findById(id: string): Promise<Mission | null> {
    return prismaCore.mission.findUnique({ where: { id } });
  },

  async findFirst(params: Prisma.MissionFindFirstArgs): Promise<Mission | null> {
    return prismaCore.mission.findFirst(params);
  },

  async create(data: Prisma.MissionCreateInput): Promise<Mission> {
    return prismaCore.mission.create({ data });
  },

  async createUnchecked(data: Prisma.MissionUncheckedCreateInput): Promise<Mission> {
    return prismaCore.mission.create({ data });
  },

  async update(id: string, data: Prisma.MissionUpdateInput): Promise<Mission> {
    return prismaCore.mission.update({ where: { id }, data });
  },

  async updateUnchecked(id: string, data: Prisma.MissionUncheckedUpdateInput): Promise<Mission> {
    return prismaCore.mission.update({ where: { id }, data });
  },

  groupBy<K extends keyof Mission>(by: K[], where: Prisma.MissionWhereInput) {
    return prismaCore.mission.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },

  async aggregateArrayField(
    missionIds: string[],
    field: "tasks" | "audience"
  ): Promise<Array<{ value: string; count: number }>> {
    if (missionIds.length === 0) {
      return [];
    }

    // Use PostgreSQL UNNEST to efficiently aggregate array fields
    // This prevents "could not resize shared memory segment" errors on large datasets
    const rows = await prismaCore.$queryRaw<Array<{ value: string; doc_count: bigint }>>(
      Prisma.sql`
        SELECT value, COUNT(DISTINCT mission_id) as doc_count
        FROM (
          SELECT id as mission_id, UNNEST(${Prisma.raw(field)}) as value
          FROM mission
          WHERE id IN (${Prisma.join(missionIds)})
        ) t
        WHERE value IS NOT NULL AND value != ''
        GROUP BY value
        ORDER BY doc_count DESC
      `
    );

    return rows.map((row) => ({
      value: row.value,
      count: Number(row.doc_count),
    }));
  },
};

export default missionRepository;
