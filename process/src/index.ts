import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { PORT, ENVIRONMENT, SENTRY_DSN } from "./config";

if (ENVIRONMENT !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "process",
    normalizeDepth: 16,
    tracesSampleRate: 0.1,
  });
}

import express from "express";
import { CronJob } from "cron";
import cors from "cors";

import "./db/mongo";
import "./db/elastic";
import "./db/postgres";

import imports from "./jobs/import";
import moderations from "./jobs/moderation";
import linkedin from "./jobs/linkedin";
import linkedinStats from "./jobs/linkedin-stats";
import warnings from "./jobs/warnings";
import metabase from "./jobs/metabase";
import rna from "./jobs/rna";
import { captureException } from "./error";
import report from "./jobs/report";

const app = express();

const runnings = {
  mission: false,
  linkedin: false,
  linkedinStats: false,
  metabase: false,
  rna: false,
  report: false,
};

// https://crontab.guru/#0_*/3_*_*_*
// Every 3 hours
const missionJob = new CronJob(
  "0 */3 * * *",
  async () => {
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "mission-updates",
      status: "in_progress",
    });
    if (runnings.mission || runnings.metabase || runnings.linkedin) {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "mission-updates",
        status: "ok",
      });
      return;
    }
    runnings.mission = true;
    try {
      await imports.handler();
      await moderations.handler();
      await warnings.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "mission-updates",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "mission-updates",
        status: "error",
      });
    }
    runnings.mission = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every day at 1:00 AM
const linkedinCron = new CronJob(
  "0 1 * * *",
  async () => {
    if (runnings.linkedin) return;
    runnings.linkedin = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "linkedin",
      status: "in_progress",
    });
    try {
      await linkedin.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin",
        status: "error",
      });
    }
    runnings.linkedin = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every day at 02:00 AM
const metabaseJob = new CronJob(
  "0 2 * * *",
  async () => {
    if (runnings.metabase) return;
    runnings.metabase = true;

    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "metabase",
      status: "in_progress",
    });
    try {
      await metabase.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "metabase",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "metabase",
        status: "error",
      });
    }
    runnings.metabase = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every friday at 09:00 AM
const linkedinStatsJob = new CronJob(
  "0 9 * * 5",
  async () => {
    runnings.linkedinStats = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "linkedin-stats",
      status: "in_progress",
    });
    try {
      await linkedinStats.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin-stats",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin-stats",
        status: "error",
      });
    }
    runnings.linkedinStats = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every 2nd of the month at 00:00 AM
const rnaJob = new CronJob(
  "0 0 2 * *",
  async () => {
    runnings.rna = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "rna",
      status: "in_progress",
    });
    try {
      await rna.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "rna",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "rna",
        status: "error",
      });
    }
    runnings.rna = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every first Tuesday of the month at 09:00 AM
const reportJob = new CronJob(
  "0 9 2 * *",
  async () => {
    // if not the first Tuesday of the month, return
    const date = new Date();
    if (date.getDay() !== 2 || date.getDate() > 7) return;

    runnings.report = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "report",
      status: "in_progress",
    });
    try {
      await report.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "report",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "report",
        status: "error",
      });
    }
    runnings.report = false;
  },
  null,
  true,
  "Europe/Paris",
);

//https://app.api-engagement.beta.gouv.fr
const origin = ["https://app.api-engagement.beta.gouv.fr"];
app.use(cors({ origin }));

app.get("/tasks", async (req, res) => {
  try {
    const tasks = [
      {
        name: "Update missions",
        schedule: missionJob.cronTime.source,
        started: missionJob.running,
        lastRun: missionJob.lastDate(),
        nextRun: missionJob.nextDate(),
        running: runnings.mission,
      },
      {
        name: "Update Linkedin",
        schedule: linkedinCron.cronTime.source,
        started: linkedinCron.running,
        lastRun: linkedinCron.lastDate(),
        nextRun: linkedinCron.nextDate(),
        running: runnings.linkedin,
      },
      {
        name: "Update Linkedin Stats",
        schedule: linkedinStatsJob.cronTime.source,
        started: linkedinStatsJob.running,
        lastRun: linkedinStatsJob.lastDate(),
        nextRun: linkedinStatsJob.nextDate(),
        running: runnings.linkedinStats,
      },
      {
        name: "Update Metabase",
        schedule: metabaseJob.cronTime.source,
        started: metabaseJob.running,
        lastRun: metabaseJob.lastDate(),
        nextRun: metabaseJob.nextDate(),
        running: runnings.metabase,
      },
      {
        name: "Update RNA",
        schedule: rnaJob.cronTime.source,
        started: rnaJob.running,
        lastRun: rnaJob.lastDate(),
        nextRun: rnaJob.nextDate(),
        running: runnings.rna,
      },
      {
        name: "Generate reports",
        schedule: reportJob.cronTime.source,
        started: reportJob.running,
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

app.listen(PORT, () => console.log("Listening on port ", PORT, "at", new Date().toISOString()));
