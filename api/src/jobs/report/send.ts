import { APP_URL } from "@/config";
import { sendTemplate } from "@/services/brevo";
import { publisherService } from "@/services/publisher";
import { reportService } from "@/services/report";
import { userService } from "@/services/user";

import type { ReportTemplateIds } from "./config";
import { MONTHS, type ReportStats } from "./generate/data";

export const sendReports = async (templateIds: ReportTemplateIds, year: number, month: number, publisherId?: string) => {
  const templateIdByReportType = {
    RECEIVED: templateIds.ANNONCEUR,
    SENT: templateIds.DIFFUSEUR,
    BOTH: templateIds.ANNONCEUR_DIFFUSEUR,
  };
  const publishers = await publisherService.findPublishers({ sendReport: true, ids: publisherId ? [publisherId] : undefined });
  const errors = [];
  const skipped = [];
  let count = 0;

  for (const publisher of publishers) {
    const report = await reportService.findOneReportByPublisherAndPeriod(publisher.id, year, month);
    if (!report?.dataTemplate || !["GENERATED", "PARTIALLY_SENT"].includes(report.status) || report.sentAt) {
      skipped.push(publisher.id);
      continue;
    }

    const users = publisher.sendReportTo.length ? await userService.findUsers({ ids: publisher.sendReportTo, publisherId: publisher.id }) : [];
    const recipients = new Set(users.map(({ email }) => email.trim().toLowerCase()).filter(Boolean));
    const sentTo = new Set(report.status === "PARTIALLY_SENT" ? report.sentTo : []);
    if (!recipients.size && !sentTo.size) {
      await reportService.updateReport(report.id, { status: "NOT_SENT_NO_RECIPIENT", sentTo: [] });
      skipped.push(publisher.id);
      continue;
    }

    const stats = report.data as ReportStats;
    const dashboardURL = new URL(`/${publisher.id}/performance`, APP_URL);
    dashboardURL.searchParams.set("from", new Date(year, month, 1).toISOString());
    dashboardURL.searchParams.set("to", new Date(year, month + 1, 1, 0, 0, 0, -1).toISOString());

    const params = {
      name: publisher.name,
      month: MONTHS[month],
      year,
      dashboardURL: dashboardURL.toString(),
      announce: report.dataTemplate !== "SENT" ? stats.receive : undefined,
      broadcast: report.dataTemplate !== "RECEIVED" ? stats.send : undefined,
    };
    let failed = 0;
    for (const email of recipients) {
      if (sentTo.has(email)) {
        continue;
      }
      const response = await sendTemplate(templateIdByReportType[report.dataTemplate], {
        emailTo: [email],
        tags: ["anonymise", `impact-report-${year}-${String(month + 1).padStart(2, "0")}`],
        params,
      });
      if (!response.ok) {
        failed += 1;
        continue;
      }

      sentTo.add(email);
      count += 1;
      await reportService.updateReport(report.id, { status: "PARTIALLY_SENT", sentTo: [...sentTo] });
    }

    if (failed) {
      if (!sentTo.size) {
        await reportService.updateReport(report.id, { status: "NOT_SENT_ERROR_SENDING", sentTo: [] });
      }
      errors.push({ id: publisher.id, error: `Brevo could not send the report to ${failed} recipient(s)` });
      continue;
    }

    await reportService.updateReport(report.id, { status: "SENT", sentAt: new Date(), sentTo: [...sentTo] });
  }

  return { count, errors, skipped };
};
