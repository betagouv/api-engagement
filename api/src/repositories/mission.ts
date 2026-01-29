import { Mission, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export type BoundingBox = {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
};

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

  /**
   * Find mission IDs within a geographic bounding box using GiST index for optimal performance.
   * This method returns distinct mission IDs that have at least one address within the bounding box.
   */
  async findMissionIdsInBoundingBox(params: {
    box: BoundingBox;
    limit: number;
    offset: number;
  }): Promise<{ ids: string[]; total: number }> {
    const { box, limit, offset } = params;

    // Use raw SQL with GiST index for efficient bounding box query
    // The box operator <@ checks if geo_point is contained within the bounding box
    const [countResult, idsResult] = await Promise.all([
      prismaCore.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT ma.mission_id)::bigint as count
        FROM mission_address ma
        WHERE ma.geo_point <@ box(
          point(${box.lonMin}, ${box.latMin}),
          point(${box.lonMax}, ${box.latMax})
        )
      `,
      prismaCore.$queryRaw<{ mission_id: string }[]>`
        SELECT DISTINCT ma.mission_id
        FROM mission_address ma
        WHERE ma.geo_point <@ box(
          point(${box.lonMin}, ${box.latMin}),
          point(${box.lonMax}, ${box.latMax})
        )
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      ids: idsResult.map((r) => r.mission_id),
      total: Number(countResult[0].count),
    };
  },
};

export default missionRepository;
