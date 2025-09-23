import { SLACK_CRON_CHANNEL_ID } from "../../config";
import { captureException } from "../../error";
import { postMessage } from "../../services/slack";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { generateReports } from "./generate";
import { sendReports } from "./send";

export interface ReportJobPayload {
  dryRun?: boolean;
}

export interface ReportJobResult extends JobResult {}

export class ReportHandler implements BaseHandler<ReportJobPayload, ReportJobResult> {
  name = "Génération des rapports d'impact";

  async handle(payload: ReportJobPayload): Promise<ReportJobResult> {
    const dryRun = payload?.dryRun ?? false;
    const start = new Date();
    let jobMessage = "Reports sent successfully";
    console.log(`[Report] Starting at ${start.toISOString()}`);
    try {
      const month = new Date().getMonth() !== 0 ? new Date().getMonth() - 1 : 11;
      const year = month === 11 ? new Date().getFullYear() - 1 : new Date().getFullYear();

      console.log(`[Report] Generating report for ${year}-${month}`);
      const generationRes = await generateReports(year, month);
      console.log(`[Report] Generated ${generationRes.count} report with ${generationRes.errors.length} errors`);
      if (generationRes.errors.length > 0) {
        console.error(`[Report] Errors`, JSON.stringify(generationRes.errors, null, 2));
        captureException(`Report generation with failure`, `Errors while genrating report`);
      }

      if (dryRun) {
        console.log(`[Report] Dry-run mode enabled - skipping email sending and Slack notification`);
        generationRes.reports.forEach((report) => {
          console.log(`[Report][Dry-run] ${report.publisherName} (${report.publisherId}) - status: ${report.status}`);
          console.dir(report.data, { depth: null });
        });
        jobMessage = `Reports generated in dry-run mode (${generationRes.count} processed)`;
      } else {
        console.log(`[Report] Sending report for ${year}-${month}`);
        const sendingRes = await sendReports(year, month);
        console.log(`[Report] Sent ${sendingRes.count} report, ${sendingRes.skipped.length} skipped and ${sendingRes.errors.length} errors`);
        if (sendingRes.errors.length > 0) {
          console.error(`[Report] Errors`, JSON.stringify(sendingRes.errors, null, 2));
          captureException(`Report sending with failure`, `Errors while sending report`);
        }
        console.log(`[Report] Sending slack message for ${year}-${month}`);

        await postMessage(
          {
            title: `Rapports d'impact du ${month + 1 < 10 ? `0${month + 1}` : month + 1}/${year} générés et envoyés`,
            text: `Rapport générés: ${generationRes.count}, emails envoyés: ${sendingRes.count}, non envoyés: ${sendingRes.skipped.length}, erreurs: ${generationRes.errors.length + sendingRes.errors.length}\n\nListe des rapports d'impact du mois [ici](https://app.api-engagement.beta.gouv.fr/admin-report?month=${month}&year=${year})`,
          },
          SLACK_CRON_CHANNEL_ID
        );
      }
    } catch (error: any) {
      console.error(error);
      captureException(`Report generation failed`, `${error.message} while generating report`);

      return {
        success: false,
        timestamp: new Date(),
        message: error.message,
      };
    }

    console.log(`[Report] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
    return {
      success: true,
      timestamp: new Date(),
      message: jobMessage,
    };
  }
}
