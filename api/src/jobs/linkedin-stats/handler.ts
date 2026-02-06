import * as XLSX from "xlsx";

import { downloadFile } from "../../controllers/brevo-webhook/helpers/download-file";
import { Email } from "../../db/core";
import { captureException } from "../../error";
import { emailService } from "../../services/email";
import { getObject } from "../../services/s3";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { processData } from "./add-stats";

const downloadXlsx = async (url: string) => {
  try {
    const response = await getObject(url);
    const arrayBuffer = response.Body as ArrayBuffer;

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    const overviewWorksheet = workbook.Sheets["Overview"];
    const jobReportingWorksheet = workbook.Sheets["Jobs Reporting"];

    const overview = XLSX.utils.sheet_to_json(overviewWorksheet, { header: 1 }) as string[][];
    const jobReporting = XLSX.utils.sheet_to_json(jobReportingWorksheet, { header: 1 }) as (string | number)[][];

    return { overview, jobReporting };
  } catch (error) {
    captureException(error, { extra: { url } });
    return null;
  }
};

const getData = async (email: Email) => {
  try {
    if (!email.fileObjectName) {
      // Link should be extracted, but try to extract it and download the file from the email once again
      const result = await downloadFile(email);
      if (!result) {
        console.log("[Linkedin Stats] No file found");
        return;
      }
      console.log(`[Linkedin Stats] Found link in email ${email.id}: ${result.link}`);
      email.fileObjectName = result.objectName;
      email.reportUrl = result.link;
      await emailService.updateEmail(email.id, { fileObjectName: result.objectName, reportUrl: result.link });
    }

    const data = await downloadXlsx(email.fileObjectName);
    if (!data) {
      console.log("[Linkedin Stats] Failed to download XLSX");
      return;
    }

    const dateRangeIndex = data.overview.findIndex((row) => row[0] === "Date range");
    if (dateRangeIndex === -1) {
      captureException("[Linkedin Stats] No date range found", { extra: { emailId: email.id, data: data.overview } });
      return;
    }
    const dateRange = data.overview[dateRangeIndex + 1][1].split(" - ").map((date) => new Date(date));
    const from = dateRange[0];
    const to = dateRange[1];
    to.setDate(to.getDate() + 1);
    to.setMilliseconds(to.getMilliseconds() - 1);

    return { data: data.jobReporting, from, to };
  } catch (error) {
    captureException(error, { extra: { emailId: email.id } });
  }
};

interface LinkedinStatsJobPayload {}

interface LinkedinStatsJobResult extends JobResult {}

export class LinkedinStatsHandler implements BaseHandler<LinkedinStatsJobPayload, LinkedinStatsJobResult> {
  name = "Import des stats Linkedin";

  public async handle(payload: LinkedinStatsJobPayload): Promise<LinkedinStatsJobResult> {
    const start = new Date();
    const result = {
      created: 0,
      failed: { data: [] as any[] },
    };
    console.log(`[Linkedin Stats] Starting at ${start.toISOString()}`);
    try {
      const emails = await emailService.findEmails({
        status: "PENDING",
        toEmail: "linkedin@api-engagement-dev.fr",
      });
      if (!emails.length) {
        console.log(`[Linkedin Stats] No email to process`);
        return {
          success: true,
          timestamp: new Date(),
          message: "No email to process",
        };
      }
      console.log(`[Linkedin Stats] Found ${emails.length} emails to process`);

      for (const email of emails) {
        const data = await getData(email);
        if (!data) {
          await emailService.updateEmail(email.id, { status: "FAILED" });
          continue;
        }

        const exists = await emailService.findEmails({
          status: "PROCESSED",
          dateFrom: data.from,
          dateTo: data.to,
        });
        if (exists.length > 0) {
          console.log(`[Linkedin Stats] Report already processed for email ${email.id}`);
          await emailService.updateEmail(email.id, { status: "DUPLICATE", dateFrom: data.from, dateTo: data.to });
          continue;
        }

        const res = await processData(data.data, data.from, data.to, email.id);
        console.log(`[Linkedin Stats] Created ${res.created} stats with ${res.failed.data.length} failed`);

        result.created += res.created;
        result.failed.data.push(...res.failed.data);

        await emailService.updateEmail(email.id, {
          status: "PROCESSED",
          dateFrom: data.from,
          dateTo: data.to,
          createdCount: res.created,
          failed: res.failed.data.length ? res.failed : null,
        });
      }

      console.log(`[Linkedin Stats] Created ${result.created} stats`);
      if (result.failed.data.length) {
        return {
          success: false,
          timestamp: new Date(),
          message: "Failed to create stats",
        };
      }
    } catch (error: any) {
      captureException(error, { extra: { message: error.message } });
      return {
        success: false,
        timestamp: new Date(),
        message: "Failed to create stats",
      };
    }

    console.log(`[Linkedin Stats] Ended at ${new Date().toISOString()}`);

    return {
      success: true,
      timestamp: new Date(),
      message: `\t• Nombre de stats créées: ${result.created}\n\t• Nombre de stats en erreur: ${result.failed.data.length}`,
    };
  }
}
