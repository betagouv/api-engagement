import { reportService } from "@/services/report";
import type { ReportCreateInput, ReportRecord } from "@/types/report";

export const createTestReport = async (data: Partial<ReportCreateInput> & { publisherId: string }): Promise<ReportRecord> => {
  const defaultData: ReportCreateInput = {
    name: "Test Report",
    month: 0,
    year: new Date().getFullYear(),
    url: `https://bucket.example.com/publishers/${data.publisherId}/reports/test.pdf`,
    objectName: `publishers/${data.publisherId}/reports/test.pdf`,
    publisherId: data.publisherId,
    publisherName: "Test Publisher",
    dataTemplate: null,
    sentAt: null,
    sentTo: [],
    status: "GENERATED",
    data: {},
  };

  return reportService.createReport({ ...defaultData, ...data });
};
