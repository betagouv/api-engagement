import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import ReportModel from "../../models/report";
import UserModel from "../../models/user";
import { sendTemplate } from "../../services/brevo";
import { Report } from "../../types";

const ANNOUNCE_TEMPLATE_ID = 20;
const BROADCAST_TEMPLATE_ID = 9;

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const compare = (a: number, b: number) => (a - b) / (a || 1);

const sendReport = async (report: Report): Promise<{ ok: boolean; data?: any }> => {
  try {
    const data = report.dataTemplate === "SEND" ? report.data.send : report.data.receive;
    const rate = data.apply / (data.click || 1);
    const lastMonthRate = data.applyLastMonth / (data.clickLastMonth || 1);
    const rateRaise = compare(rate, lastMonthRate);
    const clickRaise = compare(data.click, data.clickLastMonth);
    const applyRaise = compare(data.apply, data.applyLastMonth);

    const body = {
      emailTo: report.sentTo,
      tags: ["anonymise"],
      params: {
        name: report.publisherName,
        month: MONTHS[report.month],
        year: report.year,
        click: data.click,
        clickImprove: `${clickRaise < 0 ? "-" : "+"} ${Math.abs(clickRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`,
        apply: data.apply,
        applyImprove: `${applyRaise < 0 ? "-" : "+"} ${Math.abs(applyRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`,
        rate: rate.toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 }),
        rateImprove: `${rateRaise < 0 ? "-" : "+"} ${Math.abs(rateRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`,
        reportURL: `https://api.api-engagement.beta.gouv.fr/report/${report._id}`,
        dashboardURL: `https://app.api-engagement.beta.gouv.fr/performance?from=${new Date(report.year, report.month, 1).toISOString()}&to=${new Date(report.year, report.month + 1, 1).toISOString()}`,
      } as any,
    };

    if (data.topPublishers[0]) {
      body.params.top1 = ` 1. ${data.topPublishers[0].key} - ${data.topPublishers[0].doc_count} redirections`;
    }
    if (data.topPublishers[1]) {
      body.params.top2 = ` 2. ${data.topPublishers[1].key} - ${data.topPublishers[1].doc_count} redirections`;
    }
    if (data.topPublishers[2]) {
      body.params.top3 = ` 3. ${data.topPublishers[2].key} - ${data.topPublishers[2].doc_count} redirections`;
    }

    const templateId = report.dataTemplate === "SEND" ? BROADCAST_TEMPLATE_ID : ANNOUNCE_TEMPLATE_ID;
    return await sendTemplate(templateId, body);
  } catch (error) {
    captureException(error, "Error sending report");
    return { ok: false };
  }
};

export const sendReports = async (year: number, month: number, publisherId?: string) => {
  const query: any = { sendReport: true };
  if (publisherId) {
    query._id = publisherId;
  }
  const publishers = await PublisherModel.find(query);
  const users = await UserModel.find({});

  let count = 0;
  const errors = [];
  const skipped = [];

  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    if (publisherId) {
      console.log(`[Report] Targeting single publisher ${publisherId}`);
    }

    const report = await ReportModel.findOne({ publisherId: publisher._id, month, year });
    if (!report) {
      console.log(`[${publisher.name}] Report not found`);
      errors.push({
        name: publisher.name,
        error: `Rapport non généré car aucune donnée`,
      });
      continue;
    }

    if (!publisher.sendReportTo.length) {
      console.log(`[${publisher.name}] No recipient found`);
      skipped.push({
        name: publisher.name,
        error: `Aucun email de contact renseigné`,
      });
      report.status = "NOT_SENT_NO_RECIPIENT";
      await report.save();
      continue;
    }

    if (report.status === "NOT_GENERATED_NO_DATA") {
      console.log(`[${publisher.name}] Report not sent because of low traffic`);
      skipped.push({
        name: publisher.name,
        error: `Rapport non envoyé car faible traffic`,
      });
      continue;
    }

    if (!report.url) {
      console.log(`[${publisher.name}] Report not sent because of missing URL`);
      skipped.push({
        name: publisher.name,
        error: `Rapport non envoyé car URL manquante`,
      });
      report.status = "NOT_SENT_MISSING_URL";
      await report.save();
      continue;
    }

    const receivers = users.filter((user) => publisher.sendReportTo.includes(user._id.toString()));
    report.sentTo = receivers.map((r) => r.email);

    console.log(`[${publisher.name}] Sending report to ${report.sentTo.map((e) => e).join(", ")}`);
    const res = await sendReport(report);
    if (!res.ok) {
      console.log(`[${publisher.name}] ERROR - Error sending report`, res);
      console.error(res);
      errors.push({
        name: publisher.name,
        error: `Error sending report ${JSON.stringify(res)}`,
      });
      report.status = "NOT_SENT_ERROR_SENDING";
      await report.save();
      continue;
    }

    report.status = "SENT";
    report.sentAt = new Date();
    await report.save();
    count += report.sentTo.length;
  }

  return { count, errors, skipped };
};
