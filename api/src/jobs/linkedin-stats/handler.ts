import * as XLSX from "xlsx";

import { captureException } from "../../error";
import EmailModel from "../../models/email";
import { getObject } from "../../services/s3";
import { Email } from "../../types";
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
    captureException(error, `Failed to download ${url}`);
    return null;
  }
};

const getData = async (email: Email) => {
  try {
    if (!email.fileObjectName) {
      captureException("[Linkedin Stats] No file found", `No file found in email ${email._id}`);
      return;
    }

    const data = await downloadXlsx(email.fileObjectName);
    if (!data) {
      captureException("[Linkedin Stats] Failed to download", `Failed to download link in email ${email._id}`);
      return;
    }

    const dateRangeIndex = data.overview.findIndex((row) => row[0] === "Date range");
    if (dateRangeIndex === -1) {
      captureException("[Linkedin Stats] No date range found", `No date range found in email ${email._id}`);
      return;
    }
    const dateRange = data.overview[dateRangeIndex + 1][1].split(" - ").map((date) => new Date(date));
    const from = dateRange[0];
    const to = dateRange[1];
    to.setDate(to.getDate() + 1);
    to.setMilliseconds(to.getMilliseconds() - 1);

    return { data: data.jobReporting, from, to };
  } catch (error) {
    captureException(error, `Failed to process email ${email._id}`);
  }
};

interface LinkedinStatsJobPayload {}

interface LinkedinStatsJobResult extends JobResult {}

export class LinkedinStatsHandler implements BaseHandler<LinkedinStatsJobPayload, LinkedinStatsJobResult> {
  public async handle(payload: LinkedinStatsJobPayload): Promise<LinkedinStatsJobResult> {
    const start = new Date();
    console.log(`[Linkedin Stats] Starting at ${start.toISOString()}`);
    try {
      const emails = await EmailModel.find({
        status: "PENDING",
        "to.email": "linkedin@api-engagement-dev.fr",
      });
      if (!emails.length) {
        console.log(`[Linkedin Stats] No email to process`);
        returnSuccess(false);
      }
      console.log(`[Linkedin Stats] Found ${emails.length} emails to process`);
      const result = {
        created: 0,
        failed: { data: [] as any[] },
      };
      for (const email of emails) {
        const data = await getData(email);
        if (!data) {
          email.status = "FAILED";
          email.updatedAt = new Date();
          await email.save();
          continue;
        }

        const exists = await EmailModel.exists({
          status: "PROCESSED",
          dateFrom: data.from,
          dateTo: data.to,
        });
        if (exists) {
          console.log(`[Linkedin Stats] Report already processed for email ${email._id}`);
          email.status = "DUPLICATE";
          email.dateFrom = data.from;
          email.dateTo = data.to;
          email.updatedAt = new Date();
          await email.save();
          continue;
        }

        const res = await processData(data.data, data.from, data.to, email._id.toString());
        console.log(`[Linkedin Stats] Created ${res.created} stats with ${res.failed.data.length} failed`);

        result.created += res.created;
        result.failed.data.push(...res.failed.data);

        email.status = "PROCESSED";
        email.dateFrom = data.from;
        email.dateTo = data.to;
        email.createdCount = res.created;
        email.failed = res.failed.data.length ? res.failed : null;
        email.updatedAt = new Date();
        await email.save();
      }

      console.log(`[Linkedin Stats] Created ${result.created} stats`);
      if (result.failed.data.length) {
        captureException("[Linkedin Stats] Failed to create stats", `Failed to create stats, ${JSON.stringify(result.failed.data, null, 2)}`);
        return returnSuccess(false);
      }
    } catch (error: any) {
      console.error(`[Linkedin Stats] Error for Linkedin`, error);
      captureException(`Import linkedin flux failed`, `${error.message} while creating Linkedin flux`);
      return returnSuccess(false);
    }

    console.log(`[Linkedin Stats] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

    return returnSuccess(true);
  }
}

const returnSuccess = (status: boolean) => {
  return {
    success: status,
    timestamp: new Date(),
  };
};
