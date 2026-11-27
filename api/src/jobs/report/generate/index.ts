import { publisherService } from "@/services/publisher";
import { reportService } from "@/services/report";
import type { ReportDataTemplate } from "@/types/report";

import { getData, hasEnoughStats, MONTHS, type ReportStats } from "./data";

const computeReportDataTemplate = (data: ReportStats): ReportDataTemplate | null => {
  const hasAnnonceurStats = hasEnoughStats(data.receive);
  const hasDiffuseurStats = hasEnoughStats(data.send);

  if (hasAnnonceurStats && hasDiffuseurStats) {
    return "BOTH";
  }
  if (hasAnnonceurStats) {
    return "RECEIVED";
  }
  return hasDiffuseurStats ? "SENT" : null;
};

export const generateReports = async (year: number, month: number, publisherId?: string) => {
  const publishers = await publisherService.findPublishers({ sendReport: true, ids: publisherId ? [publisherId] : undefined });
  const reports = [];
  const errors = [];

  for (const publisher of publishers) {
    const existing = await reportService.findOneReportByPublisherAndPeriod(publisher.id, year, month);
    if (existing?.sentAt || existing?.status === "SENT" || existing?.status === "PARTIALLY_SENT") {
      continue;
    }

    let data: ReportStats = {};
    let dataTemplate: ReportDataTemplate | null = null;
    let status: string;
    try {
      data = await getData(year, month, publisher);
      dataTemplate = computeReportDataTemplate(data);
      status = dataTemplate ? "GENERATED" : "NOT_GENERATED_NO_DATA";
    } catch (error) {
      status = "NOT_GENERATED_ERROR_GENERATION";
      errors.push({ id: publisher.id, error: error instanceof Error ? error.message : String(error) });
    }

    const report = {
      name: `Rapport ${MONTHS[month]} ${year}`,
      publisherId: publisher.id,
      publisherName: publisher.name,
      month,
      year,
      data,
      dataTemplate,
      status,
    };
    if (existing) {
      await reportService.updateReport(existing.id, report);
    } else {
      await reportService.createReport({ ...report, url: "", objectName: null, sentAt: null, sentTo: [] });
    }
    reports.push(report);
  }

  return { count: reports.length, errors, reports };
};
