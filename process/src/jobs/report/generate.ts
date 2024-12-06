import puppeteer, { Browser } from "puppeteer";

import PublisherModel from "../../models/publisher";
import ReportModel from "../../models/report";

import { putObject, OBJECT_ACL, BUCKET_URL } from "../../services/s3";
import { Publisher, Report, StatsReport } from "../../types";
import api from "../../services/api";
import server from "./server";
import { API_KEY, PDF_URL } from "../../config";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const fetchData = async (publisherId: string, year: number, month: number) => {
  try {
    const response = await api.get<{ data: StatsReport; publisher: Publisher }>(`/stats-report?year=${year}&month=${month}&publisherId=${publisherId}`);
    if (!response.data) return null;
    return response.data as { data: StatsReport; publisher: Publisher };
  } catch (err) {
    return null;
  }
};

const pdfGeneration = async (browser: Browser, publisher: Publisher, year: number, month: number) => {
  const errors = [] as { id: string; name: string; error: string }[];
  try {
    console.log(`[${publisher.name}] Recovering data`);
    const result = await fetchData(publisher._id.toString(), year, month);

    if (!result) {
      console.log(`[${publisher.name}] Error fetching data`);
      errors.push({
        id: publisher._id.toString(),
        name: publisher.name,
        error: `Error fetching data`,
      });
      return { errors };
    }
    const { data } = result;

    const existing = await ReportModel.findOne({ publisherId: publisher._id, year, month });

    if (!data.send?.hasStats && !data.receive?.hasStats) {
      console.log(`[${publisher.name}] No data to generate report`);
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
        clicksTo: data.receive ? data.receive.click : 0,
        clicksFrom: data.send ? data.send.click : 0,
        applyTo: data.receive ? data.receive.apply : 0,
        applyFrom: data.send ? data.send.apply : 0,
        error: "Données insuffisantes pour générer le rapport",
        data,
      } as Report;

      if (existing) {
        await ReportModel.updateOne({ _id: existing._id }, obj);
        console.log(`[${publisher.name}] Report object updated`);
      } else {
        await ReportModel.create(obj);
        console.log(`[${publisher.name}] Report object created`);
      }

      return { errors };
    }

    console.log(`[${publisher.name}] Downloading PDF...`);
    const page = await browser.newPage();
    await page.goto(`http://localhost:3000/report/${publisher._id}?year=${year}&month=${month}&apiKey=${API_KEY}`, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: 1360,
      height: 1116,
      printBackground: true,
    });

    console.log(`[${publisher.name}] PDF Downloaded`);
    console.log(`[${publisher.name}] Uploading pdf to S3...`);

    const objectName = `publishers/${publisher._id}/reports/${year}${month + 1 < 10 ? `0${month + 1}` : month + 1}.pdf`;

    const buffer = Buffer.from(pdf);
    const res = await putObject(objectName, buffer, { ACL: OBJECT_ACL.PUBLIC_READ });
    if (res instanceof Error) {
      console.log(`[${publisher.name}] ERROR - Error uploading to S3 ${res}`);
      console.error(res);
      errors.push({
        id: publisher._id.toString(),
        name: publisher.name,
        error: `Error uploading to S3 ${res}`,
      });
      return { errors };
    }

    console.log(`[${publisher.name}] PDF uploaded to S3`);

    console.log(`[${publisher.name}] Creating report object...`);
    const obj = {
      name: `Rapport ${MONTHS[month]} ${year}`,
      month,
      year,
      objectName,
      url: `${BUCKET_URL}/${objectName}`,
      publisherId: publisher._id,
      publisherName: publisher.name,
      sent: false,
      sentAt: null,
      sentTo: [],
      dataTemplate: data.receive?.hasStats && data.send?.hasStats ? "BOTH" : data.receive?.hasStats ? "RECEIVE" : "SEND",
      clicksTo: data.receive ? data.receive.click : 0,
      clicksFrom: data.send ? data.send.click : 0,
      applyTo: data.receive ? data.receive.apply : 0,
      applyFrom: data.send ? data.send.apply : 0,
      data,
    };

    if (existing) {
      await ReportModel.updateOne({ _id: existing._id }, obj);
      console.log(`[${publisher.name}] Report object updated`);
    } else {
      await ReportModel.create(obj);
      console.log(`[${publisher.name}] Report object created`);
    }
  } catch (err) {
    console.log(`[${publisher.name}] ERROR - catch ${err}`);
    console.error(err);
    errors.push({
      id: publisher._id.toString(),
      name: publisher.name,
      error: `Error durring pdf generation ${JSON.stringify(err)}`,
    });
  }
  return { errors };
};

const startServer = async () => {
  return new Promise((resolve) => {
    server.listen(3000, () => resolve(true));
  });
};

export const generate = async (year: number, month: number) => {
  const publishers = await PublisherModel.find({ automated_report: true });
  let count = 0;
  const errors = [] as { id: string; name: string; error: string }[];

  await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      "--disable-web-security",
    ],
  });
  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];

    const res = await pdfGeneration(browser, publisher, year, month);
    count += 1;
    errors.push(...res.errors);
  }
  await browser.close();

  return { count, errors };
};
