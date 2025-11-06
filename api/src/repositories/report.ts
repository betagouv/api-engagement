import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const reportRepository = {
  async find<T extends Prisma.ReportFindManyArgs>(
    params: Prisma.SelectSubset<T, Prisma.ReportFindManyArgs>
  ): Promise<Prisma.ReportGetPayload<T>[]> {
    return prismaCore.report.findMany(params);
  },

  async findFirst<T extends Prisma.ReportFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.ReportFindFirstArgs>
  ): Promise<Prisma.ReportGetPayload<T> | null> {
    return prismaCore.report.findFirst(params);
  },

  async findById<T extends Prisma.ReportFindUniqueArgs>(
    params: Prisma.SelectSubset<T, Prisma.ReportFindUniqueArgs>
  ): Promise<Prisma.ReportGetPayload<T> | null> {
    return prismaCore.report.findUnique(params);
  },

  async count(where: Prisma.ReportWhereInput = {}): Promise<number> {
    return prismaCore.report.count({ where });
  },

  async groupByPublisher(where: Prisma.ReportWhereInput = {}): Promise<Array<{ publisherId: string; publisherName: string; count: number }>> {
    const rows = await prismaCore.report.groupBy({
      by: ["publisherId"],
      where,
      _count: { _all: true },
    });

    if (!rows.length) {
      return [];
    }

    const publishers = await prismaCore.publisher.findMany({
      where: {
        id: {
          in: rows.map((row) => row.publisherId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const nameById = new Map(publishers.map(({ id, name }) => [id, name]));

    return rows.map((row) => ({
      publisherId: row.publisherId,
      publisherName: nameById.get(row.publisherId) ?? "",
      count: row._count?._all ?? 0,
    }));
  },

  async groupByStatus(where: Prisma.ReportWhereInput = {}): Promise<Array<{ status: string | null; count: number }>> {
    const rows = await prismaCore.report.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  },

  async create<T extends Prisma.ReportCreateArgs>(
    params: Prisma.SelectSubset<T, Prisma.ReportCreateArgs>
  ): Promise<Prisma.ReportGetPayload<T>> {
    return prismaCore.report.create(params);
  },

  async update<T extends Prisma.ReportUpdateArgs>(
    params: Prisma.SelectSubset<T, Prisma.ReportUpdateArgs>
  ): Promise<Prisma.ReportGetPayload<T>> {
    return prismaCore.report.update(params);
  },
};
