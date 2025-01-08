import { jsPDF } from "jspdf";
import fs from "fs";

import { putObject, OBJECT_ACL, BUCKET_URL } from "../../../services/s3";
import { Publisher, Report } from "../../../types";
import PublisherModel from "../../../models/publisher";

import Marianne from "../fonts/Marianne";
import MarianneBold from "../fonts/MarianneBold";

import { generateHeader } from "./header";
import { generateOverview } from "./overview";
import { generateAnnounce } from "./announce";
import { generateBroadcast } from "./broadcast";
import { PAGE_WIDTH, PAGE_HEIGHT } from "./utils";
import { getData, MONTHS } from "./data";
import ReportModel from "../../../models/report";

export const generateReport = async (publisher: Publisher, year: number, month: number) => {
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
    const objectName = `publishers/${publisher._id}/reports/${year}${month + 1 < 10 ? `0${month + 1}` : month + 1}.pdf`;
    const buffer = Buffer.from(doc.output("arraybuffer"));
    await putObject(objectName, buffer, { ACL: OBJECT_ACL.PUBLIC_READ });
    fs.writeFileSync(`rapports/${publisher._id}.pdf`, buffer);

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

export const generate = async (year: number, month: number) => {
  const publishers = await PublisherModel.find({ automated_report: true });
  let count = 0;
  const errors = [] as { id: string; name: string; error: string }[];

  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    const res = await generateReport(publisher, year, month);
    const obj = {
      name: `Rapport ${MONTHS[month]} ${year}`,
      month,
      year,
      objectName: null,
      url: null,
      publisherId: publisher._id.toString(),
      publisherName: publisher.name,
      sent: false,
      sentAt: null,
      sentTo: [] as string[],
      dataTemplate: "NONE",
      data: res.data,
    } as Report;

    if (res.error) {
      obj.error = "Erreur lors de la génération du rapport";
      errors.push({ id: publisher._id.toString(), name: publisher.name, error: obj.error });
    } else if (!res.objectName) {
      obj.error = "Données insuffisantes pour générer le rapport";
      errors.push({ id: publisher._id.toString(), name: publisher.name, error: obj.error });
    } else {
      obj.objectName = res.objectName;
      obj.url = res.url;
      obj.sent = true;
      obj.sentAt = new Date();
      obj.sentTo = [];

      obj.clicksTo = res.data.receive ? res.data.receive.click : 0;
      obj.clicksFrom = res.data.send ? res.data.send.click : 0;
      obj.applyTo = res.data.receive ? res.data.receive.apply : 0;
      obj.applyFrom = res.data.send ? res.data.send.apply : 0;
      obj.dataTemplate = res.data.send ? "SEND" : "RECEIVE";
    }
    const existing = await ReportModel.findOne({ publisherId: publisher._id, year, month });
    if (existing) {
      await ReportModel.updateOne({ _id: existing._id }, obj);
      console.log(`[${publisher.name}] Report object updated`);
    } else {
      await ReportModel.create(obj);
      console.log(`[${publisher.name}] Report object created`);
    }
    count += 1;
  }

  return { count, errors };
};
