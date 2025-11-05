import { Prisma, Report } from "../db/core";
import { prismaCore } from "../db/postgres";

export const reportRepository = {
  async find(params: Prisma.ReportFindManyArgs = {}): Promise<Report[]> {
    return prismaCore.report.findMany(params);
  },

  async findFirst(params: Prisma.ReportFindFirstArgs): Promise<Report | null> {
    return prismaCore.report.findFirst(params);
  },

  async findById(id: string): Promise<Report | null> {
    return prismaCore.report.findUnique({ where: { id } });
  },

  async count(where: Prisma.ReportWhereInput = {}): Promise<number> {
    return prismaCore.report.count({ where });
  },

  async groupByPublisher(where: Prisma.ReportWhereInput = {}): Promise<Array<{ publisherId: string; publisherName: string; count: number }>> {
    const rows = await prismaCore.report.groupBy({
      by: ["publisherId", "publisherName"],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({
      publisherId: row.publisherId,
      publisherName: row.publisherName,
      count: row._count._all,
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

  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return await prismaCore.report.create({
      data,
    });
  },

  async update(id: string, patch: Prisma.ReportUpdateInput): Promise<Report> {
    return await prismaCore.report.update({ where: { id }, data: patch });
  },
};
