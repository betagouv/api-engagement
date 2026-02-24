import { Prisma } from "@/db/core";
import { reportRepository } from "@/repositories/report";
import type {
  ReportAggregations,
  ReportCreateInput,
  ReportFindParams,
  ReportFindWithAggregationsParams,
  ReportRecord,
  ReportSearchFilters,
  ReportSearchResult,
  ReportSortField,
  ReportUpdatePatch,
} from "@/types/report";

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

const defaultInclude = { publisher: true } as const satisfies Prisma.ReportInclude;

type ReportWithPublisher = Prisma.ReportGetPayload<{ include: typeof defaultInclude }>;

const toReportRecord = ({ publisher, ...report }: ReportWithPublisher): ReportRecord => ({
  ...report,
  publisherName: publisher.name,
});

export const reportService = {
  async findReports(params: ReportFindParams = {}): Promise<ReportRecord[]> {
    const where = buildWhere(params);
    const reports = await reportRepository.find({
      where,
      orderBy: { sentAt: Prisma.SortOrder.desc },
      include: defaultInclude,
    });
    return reports.map(toReportRecord);
  },

  async findReportsWithAggregations(params: ReportFindWithAggregationsParams): Promise<ReportSearchResult> {
    const { from, size, sortBy, status, publisherId, month, year } = params;
    const where = buildWhere({ status, publisherId, month, year });
    const skip = Math.max(0, from);
    const take = Math.max(1, Math.min(size, 100));

    const sortFieldToOrderBy = (sortBy: ReportSortField): Prisma.ReportOrderByWithRelationInput => {
      switch (sortBy) {
        case "publisherName":
          return { publisher: { name: Prisma.SortOrder.desc } };
        case "sentAt":
          return { sentAt: Prisma.SortOrder.desc };
        default:
          return { createdAt: Prisma.SortOrder.desc };
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

    const [reports, total, publisherBuckets, statusBuckets] = await Promise.all([
      reportRepository.find({
        where,
        skip,
        take,
        orderBy: sortFieldToOrderBy(sortBy),
        include: defaultInclude,
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

  async findOneReportById(id: string): Promise<ReportRecord | null> {
    const report = await reportRepository.findById({
      where: { id },
      include: defaultInclude,
    });

    return report ? toReportRecord(report) : null;
  },

  async findOneReportByPublisherAndPeriod(publisherId: string, year: number, month: number): Promise<ReportRecord | null> {
    const report = await reportRepository.findFirst({
      where: {
        publisherId,
        year,
        month,
      },
      include: defaultInclude,
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
      publisher: {
        connect: {
          id: input.publisherId,
        },
      },
      dataTemplate: input.dataTemplate ?? null,
      sentAt: input.sentAt ?? null,
      sentTo: input.sentTo ?? [],
      status: input.status,
      data: input.data ?? {},
      updatedAt: new Date(),
    };

    const report = await reportRepository.create({
      data,
      include: defaultInclude,
    });

    return toReportRecord(report);
  },

  async updateReport(id: string, patch: ReportUpdatePatch): Promise<ReportRecord> {
    const data: any = {
      updatedAt: new Date(),
    };

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

    const report = await reportRepository.update({
      where: { id },
      data,
      include: defaultInclude,
    });

    return toReportRecord(report);
  },
};
