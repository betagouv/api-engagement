import { Prisma, Report } from "../db/core";
import { reportRepository } from "../repositories/report";
import type {
  ReportAggregations,
  ReportCreateInput,
  ReportDataTemplate,
  ReportFindParams,
  ReportRecord,
  ReportSearchFilters,
  ReportSearchParams,
  ReportSearchResult,
  ReportSortField,
  ReportUpdatePatch,
} from "../types/report";

const toReportRecord = (report: Report): ReportRecord => ({
  id: report.id,
  _id: report.id,
  name: report.name,
  month: report.month,
  year: report.year,
  url: report.url,
  objectName: report.objectName,
  publisherId: report.publisherId,
  publisherName: report.publisherName,
  dataTemplate: report.dataTemplate as ReportDataTemplate,
  sentAt: report.sentAt,
  sentTo: report.sentTo,
  status: report.status,
  data: report.data as any, // JSON
  createdAt: (report as any).createdAt ?? null,
  updatedAt: (report as any).updatedAt ?? null,
});

const buildWhere = (filters: ReportSearchFilters = {}): Prisma.ReportWhereInput => {
  const where: Prisma.ReportWhereInput = {};

  if (filters.publisherId) {
    where.publisherId = filters.publisherId;
  }
  if (typeof filters.month === "number") {
    where.month = filters.month;
  }
  if (typeof filters.year === "number") {
    where.year = filters.year;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  return where;
};

const sortFieldToOrderBy = (sortBy: ReportSortField): Prisma.ReportOrderByWithRelationInput => {
  switch (sortBy) {
    case "publisherName":
      return { publisherName: Prisma.SortOrder.desc };
    case "sentAt":
      return { sentAt: Prisma.SortOrder.desc };
    case "createdAt":
    default:
      return { sentAt: Prisma.SortOrder.desc };
  }
};

const toAggregations = (
  publishers: Array<{ publisherId: string; publisherName: string; count: number }>,
  status: Array<{ status: string | null; count: number }>
): ReportAggregations => ({
  publishers: publishers.map((row) => ({
    _id: row.publisherId,
    count: row.count,
    name: row.publisherName,
  })),
  status: status
    .filter((row) => !!row.status)
    .map((row) => ({
      _id: row.status as string,
      count: row.count,
    })),
});

export const reportService = {
  async findReports(params: ReportFindParams = {}): Promise<ReportRecord[]> {
    const where = buildWhere(params);
    const reports = await reportRepository.find({
      where,
      orderBy: { sentAt: Prisma.SortOrder.desc },
    });
    return reports.map(toReportRecord);
  },

  async searchReports(params: ReportSearchParams): Promise<ReportSearchResult> {
    const { from, size, sortBy, status, publisherId, month, year } = params;
    const where = buildWhere({ status, publisherId, month, year });
    const skip = Math.max(0, from);
    const take = Math.max(1, Math.min(size, 100));

    const [reports, total, publisherBuckets, statusBuckets] = await Promise.all([
      reportRepository.find({
        where,
        skip,
        take,
        orderBy: sortFieldToOrderBy(sortBy),
      }),
      reportRepository.count(where),
      reportRepository.groupByPublisher(where),
      reportRepository.groupByStatus(where),
    ]);

    return {
      data: reports.map(toReportRecord),
      total,
      aggs: toAggregations(publisherBuckets, statusBuckets),
    };
  },

  async getReportById(id: string): Promise<ReportRecord | null> {
    const report = await reportRepository.findById(id);
    return report ? toReportRecord(report) : null;
  },

  async findReportByPublisherAndPeriod(publisherId: string, year: number, month: number): Promise<ReportRecord | null> {
    const report = await reportRepository.findFirst({
      where: {
        publisherId,
        year,
        month,
      },
    });
    return report ? toReportRecord(report) : null;
  },

  async createReport(input: ReportCreateInput): Promise<ReportRecord> {
    const data = {
      name: input.name,
      month: input.month,
      year: input.year,
      url: input.url,
      objectName: input.objectName ?? null,
      publisherId: input.publisherId,
      publisherName: input.publisherName,
      dataTemplate: input.dataTemplate ?? null,
      sentAt: input.sentAt ?? null,
      sentTo: input.sentTo ?? [],
      status: input.status,
      data: input.data ?? {},
    };

    return toReportRecord(await reportRepository.create(data));
  },

  async updateReport(id: string, patch: ReportUpdatePatch): Promise<ReportRecord> {
    const data: any = {};

    if ("name" in patch) {
      data.name = patch.name ?? undefined;
    }
    if ("month" in patch) {
      data.month = patch.month ?? undefined;
    }
    if ("year" in patch) {
      data.year = patch.year ?? undefined;
    }
    if ("url" in patch) {
      data.url = patch.url ?? undefined;
    }
    if ("objectName" in patch) {
      data.objectName = patch.objectName ?? undefined;
    }
    if ("publisherId" in patch) {
      data.publisherId = patch.publisherId ?? undefined;
    }
    if ("publisherName" in patch) {
      data.publisherName = patch.publisherName ?? undefined;
    }
    if ("dataTemplate" in patch) {
      data.dataTemplate = patch.dataTemplate ?? undefined;
    }
    if ("sentAt" in patch) {
      data.sentAt = patch.sentAt ?? undefined;
    }
    if ("sentTo" in patch) {
      data.sentTo = { set: patch.sentTo ?? [] };
    }
    if ("status" in patch) {
      data.status = patch.status ?? undefined;
    }
    if ("data" in patch) {
      data.data = patch.data ?? undefined;
    }

    return toReportRecord(await reportRepository.update(id, data));
  },
};
