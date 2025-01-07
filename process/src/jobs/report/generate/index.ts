import { jsPDF } from "jspdf";
import fs from "fs";

import { putObject, OBJECT_ACL, BUCKET_URL } from "../../../services/s3";
import { Publisher, StatsReport } from "../../../types";
import PublisherModel from "../../../models/publisher";
import api from "../../../services/api";

import Marianne from "../fonts/Marianne";
import MarianneBold from "../fonts/MarianneBold";

import { generateHeader } from "./header";
import { generateOverview } from "./overview";
import { generateAnnounce } from "./announce";
import { generateBroadcast } from "./broadcast";
import { PAGE_WIDTH, PAGE_HEIGHT } from "./utils";

export const generateReport = async (publisher: Publisher, year: number, month: number) => {
  try {
    // For now using fake data, later will use fetchData
    const fakeData: StatsReport = {
      publisherId: "123",
      publisherName: "Test Publisher",
      publisherLogo: "logo.png",
      month: 3,
      monthName: "mars",
      year: 2024,
      id: "report_123",
      receive: {
        hasStats: true,
        print: 5000,
        printLastMonth: 4000,
        click: 1200,
        clickLastMonth: 1000,
        clickYear: 14400,
        clickLastYear: 12000,
        apply: 150,
        applyLastMonth: 100,
        applyYear: 1800,
        applyLastYear: 1200,
        account: 300,
        accountLastMonth: 250,
        topPublishers: [
          { key: "Platform A", doc_count: 500 },
          { key: "Platform B", doc_count: 300 },
          { key: "Platform C", doc_count: 200 },
        ],
        topOrganizations: [
          { key: "Organization X", doc_count: 100 },
          { key: "Organization Y", doc_count: 80 },
          { key: "Organization Z", doc_count: 60 },
        ],
        graphYears: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1),
          click: Math.floor(1000 + Math.random() * 500),
          clickLastYear: Math.floor(800 + Math.random() * 400),
          apply: Math.floor(100 + Math.random() * 50),
          applyLastYear: Math.floor(80 + Math.random() * 40),
        })),
        organizationHistogram: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).getTime(),
          "Organization X": Math.floor(50 + Math.random() * 30),
          "Organization Y": Math.floor(40 + Math.random() * 25),
          "Organization Z": Math.floor(30 + Math.random() * 20),
        })),
      },
      send: {
        hasStats: false,
        print: 8000,
        printLastMonth: 8500,
        click: 2000,
        clickLastMonth: 2200,
        clickYear: 24000,
        clickLastYear: 26400,
        apply: 200,
        applyLastMonth: 220,
        applyYear: 2400,
        applyLastYear: 2640,
        account: 450,
        accountLastMonth: 500,
        topPublishers: [
          { key: "Platform X", doc_count: 800 },
          { key: "Platform Y", doc_count: 600 },
          { key: "Platform Z", doc_count: 400 },
        ],
        topOrganizations: [
          { key: "Organization A", doc_count: 200 },
          { key: "Organization B", doc_count: 150 },
          { key: "Organization C", doc_count: 100 },
        ],
        graphYears: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1),
          click: Math.floor(2000 + Math.random() * 1000),
          clickLastYear: Math.floor(1800 + Math.random() * 800),
          apply: Math.floor(200 + Math.random() * 100),
          applyLastYear: Math.floor(180 + Math.random() * 80),
        })),
        organizationHistogram: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).getTime(),
          "Organization A": Math.floor(100 + Math.random() * 50),
          "Organization B": Math.floor(80 + Math.random() * 40),
          "Organization C": Math.floor(60 + Math.random() * 30),
        })),
      },
    };

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
    await generateHeader(doc, publisher, month, year, 1, fakeData.send?.hasStats && fakeData.receive?.hasStats ? 3 : 2);
    generateOverview(doc, fakeData);

    // Announce details page if exists
    if (fakeData.receive?.hasStats) {
      doc.addPage();
      doc.setFillColor("#f6f6f6");
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
      await generateHeader(doc, publisher, month, year, 2, fakeData.send?.hasStats ? 3 : 2);
      generateAnnounce(doc, fakeData, year);
    }

    // Broadcast details page if exists
    if (fakeData.send?.hasStats) {
      doc.addPage();
      doc.setFillColor("#f6f6f6");
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
      await generateHeader(doc, publisher, month, year, fakeData.receive?.hasStats ? 3 : 2, fakeData.receive?.hasStats ? 3 : 2);
      generateBroadcast(doc, fakeData, year);
    }

    // Save and upload file
    const objectName = `${publisher._id}.pdf`;
    const buffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(objectName, buffer);

    return {
      url: `${BUCKET_URL}/${objectName}`,
      objectName,
    };
  } catch (error) {
    console.error(`Error generating report for ${publisher.name}:`, error);
    return null;
  }
};

export const generate = async (year: number, month: number) => {
  const publishers = await PublisherModel.find({ _id: "5f5931496c7ea514150a818f" });
  let count = 0;
  const errors = [] as { id: string; name: string; error: string }[];

  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    const res = await generateReport(publisher, year, month);
    count += 1;
  }

  return { count, errors };
};
