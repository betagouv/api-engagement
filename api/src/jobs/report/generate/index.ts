import { jsPDF } from "jspdf";

import { publisherService } from "../../../services/publisher";
import { reportService } from "../../../services/report";
import { BUCKET_URL, OBJECT_ACL, putObject } from "../../../services/s3";
import type { PublisherRecord } from "../../../types/publisher";
import type { ReportCreateInput, ReportDataTemplate, ReportUpdatePatch } from "../../../types/report";
import { StatsReport } from "../../../types/report";

import Marianne from "../fonts/Marianne";
import MarianneBold from "../fonts/MarianneBold";

import { generateAnnounce } from "./announce";
import { generateBroadcast } from "./broadcast";
import { getData, MONTHS } from "./data";
import { generateHeader } from "./header";
import { generateOverview } from "./overview";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./utils";

export interface GeneratedReportPreview {
  publisherId: string;
  publisherName: string;
  status: string;
  data: StatsReport | undefined;
  dataTemplate?: ReportDataTemplate | null;
  url?: string | null;
  objectName?: string | null;
}

const computeReportDataTemplate = (data?: StatsReport): ReportDataTemplate | null => {
  if (!data) {
    return null;
  }

  const hasReceive = data.receive?.hasStats ?? false;
  const hasSend = data.send?.hasStats ?? false;

  if (hasReceive && hasSend) {
    return "BOTH";
  }
  if (hasSend) {
    return "SENT";
  }
  if (hasReceive) {
    return "RECEIVED";
  }

  return null;
};

export const generateReport = async (publisher: PublisherRecord, year: number, month: number) => {
  try {
    // For now using fake data, later will use fetchData
    const data = await getData(year, month, publisher);

    if ((data.send?.hasStats || false) === false && (data.receive?.hasStats || false) === false) {
      return { data };
    }

    // Initialize PDF with correct dimensions
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [PAGE_WIDTH, PAGE_HEIGHT],
    });
    // Add fonts first
    doc.addFileToVFS("Marianne.ttf", Marianne);
    doc.addFont("Marianne.ttf", "Marianne", "normal");
    doc.addFileToVFS("MarianneBold.ttf", MarianneBold);
    doc.addFont("MarianneBold.ttf", "Marianne", "bold");

    // Overview page #f6f6f6
    doc.setFillColor("#f6f6f6");
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
    await generateHeader(doc, publisher, month, year, 1, data.send?.hasStats && data.receive?.hasStats ? 3 : 2);
    generateOverview(doc, data);

    // Announce details page if exists
    if (data.receive?.hasStats) {
      doc.addPage();
      doc.setFillColor("#f6f6f6");
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
      await generateHeader(doc, publisher, month, year, 2, data.send?.hasStats ? 3 : 2);
      generateAnnounce(doc, data);
    }

    // Broadcast details page if exists
    if (data.send?.hasStats) {
      doc.addPage();
      doc.setFillColor("#f6f6f6");
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
      await generateHeader(doc, publisher, month, year, data.receive?.hasStats ? 3 : 2, data.receive?.hasStats ? 3 : 2);
      generateBroadcast(doc, data);
    }

    // Save and upload file
    const objectName = `publishers/${publisher.id}/reports/${year}${month + 1 < 10 ? `0${month + 1}` : month + 1}.pdf`;
    const buffer = Buffer.from(doc.output("arraybuffer"));
    await putObject(objectName, buffer, { ACL: OBJECT_ACL.PUBLIC_READ });

    return {
      data,
      url: `${BUCKET_URL}/${objectName}`,
      objectName,
    };
  } catch (error) {
    console.error(`Error generating report for ${publisher.name}:`, error);
    return { error: true };
  }
};

export const generateReports = async (year: number, month: number, publisherId?: string) => {
  const filters: any = { sendReport: true };
  if (publisherId) {
    filters.ids = [publisherId];
  }
  const publishers = await publisherService.findPublishers(filters);
  let count = 0;
  const errors = [] as { id: string; name: string; error: string }[];
  const reports: GeneratedReportPreview[] = [];
  console.log(`[Report] Generating report for ${year}-${month} for ${publishers.length} publisher(s)${publisherId ? ` [filtered: ${publisherId}]` : ""}`);
  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    console.log(`[Report] Generating report for ${year}-${month} for ${publisher.name}`);
    const res = await generateReport(publisher, year, month);

    const name = `Rapport ${MONTHS[month]} ${year}`;
    let status = "GENERATED";
    let url: string | undefined;
    let objectName: string | undefined;
    let dataTemplate: ReportDataTemplate | null | undefined;
    const data = res.data;

    if (res.error) {
      console.error(`[Report] Error generating report for ${year}-${month} for ${publisher.name}:`, res.error);
      status = "NOT_GENERATED_ERROR_GENERATION";
      errors.push({
        id: publisher.id,
        name: publisher.name,
        error: "Erreur lors de la génération du rapport",
      });
    } else if (!res.objectName) {
      console.error(`[Report] No data for ${year}-${month} for ${publisher.name}`);
      status = "NOT_GENERATED_NO_DATA";
    } else {
      console.log(`[Report] Report generated for ${year}-${month} for ${publisher.name}`);
      objectName = res.objectName ?? undefined;
      url = res.url ?? undefined;
      dataTemplate = computeReportDataTemplate(res.data);
    }

    const existing = await reportService.findReportByPublisherAndPeriod(publisher.id, year, month);

    if (existing) {
      const patch: ReportUpdatePatch = {
        name,
        month,
        year,
        publisherId: publisher.id,
        publisherName: publisher.name,
        status,
      };

      if (typeof url !== "undefined") {
        patch.url = url;
      }
      if (typeof objectName !== "undefined") {
        patch.objectName = objectName;
      }
      if (typeof dataTemplate !== "undefined") {
        patch.dataTemplate = dataTemplate;
      }
      if (typeof data !== "undefined") {
        patch.data = data;
      }

      await reportService.updateReport(existing.id, patch);
      console.log(`[${publisher.name}] Report object updated`);
    } else {
      const payload: ReportCreateInput = {
        name,
        month,
        year,
        url: url ?? "",
        objectName: objectName ?? null,
        publisherId: publisher.id,
        publisherName: publisher.name,
        dataTemplate: typeof dataTemplate !== "undefined" ? dataTemplate : null,
        sentAt: null,
        sentTo: [],
        status,
        data: data ?? {},
      };

      await reportService.createReport(payload);
      console.log(`[${publisher.name}] Report object created`);
    }

    count += 1;
    reports.push({
      publisherId: publisher.id,
      publisherName: publisher.name,
      status,
      data,
      dataTemplate: typeof dataTemplate !== "undefined" ? dataTemplate : (existing?.dataTemplate ?? null),
      url: typeof url !== "undefined" ? url : (existing?.url ?? null),
      objectName: typeof objectName !== "undefined" ? objectName : (existing?.objectName ?? null),
    });
  }

  return { count, errors, reports };
};
