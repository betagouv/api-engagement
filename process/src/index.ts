import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { ENVIRONMENT, PORT, SENTRY_DSN } from "./config";

if (ENVIRONMENT !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: `process-${ENVIRONMENT}`,
    normalizeDepth: 16,
    tracesSampleRate: 0.1,
  });
}

import cors from "cors";
import { CronJob } from "cron";
import express from "express";

import "./db/elastic";
import "./db/mongo";
import "./db/postgres";

import { captureException } from "./error";
import report from "./jobs/report";

const app = express();

const runnings = {
  report: false,
};

// Every first Tuesday of the month at 10:00 AM
const reportJob = new CronJob(
  "0 10 * * 2",
  async () => {
    // if not the first Tuesday of the month, return (can't be checked in)
    const date = new Date();
    if (date.getDay() !== 2 || date.getDate() > 7) {
      return;
    }

    runnings.report = true;
    try {
      await report.handler();
    } catch (error) {
      captureException(error);
    }
    runnings.report = false;
  },
  null,
  true,
  "Europe/Paris"
);

//https://app.api-engagement.beta.gouv.fr
const origin = ["https://app.api-engagement.beta.gouv.fr"];
app.use(cors({ origin }));

app.get("/tasks", async (req, res) => {
  try {
    const tasks = [
      {
        name: "Generate reports",
        schedule: reportJob.cronTime.source,
        started: reportJob.isActive,
        lastRun: reportJob.lastDate(),
        nextRun: reportJob.nextDate(),
        running: runnings.report,
      },
    ];

    res.status(200).send({ ok: true, data: tasks });
  } catch (error) {
    captureException(error);
    res.status(500).send({ ok: false, code: "SERVER ERROR" });
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT} at ${new Date().toISOString()}`));
