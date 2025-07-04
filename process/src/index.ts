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
import imports from "./jobs/import";
import leboncoin from "./jobs/leboncoin";
import linkedinStats from "./jobs/linkedin-stats";
import metabase from "./jobs/metabase";
import moderation from "./jobs/moderation";
import report from "./jobs/report";

const app = express();

const runnings = {
  mission: false,
  linkedinStats: false,
  metabase: false,
  leboncoin: false,
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
    if (runnings.mission || runnings.metabase) {
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
      await moderation.handler();
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
  "Europe/Paris"
);

// Every day at 02:00 AM
const metabaseJob = new CronJob(
  "0 2 * * *",
  async () => {
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "metabase",
      status: "in_progress",
    });
    if (runnings.metabase) {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "metabase",
        status: "ok",
      });
      return;
    }
    runnings.metabase = true;

    try {
      await metabase.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "metabase",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
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
  "Europe/Paris"
);

// Every friday at 09:00 AM
const linkedinStatsJob = new CronJob(
  "0 9 * * 5",
  async () => {
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "linkedin-stats",
      status: "in_progress",
    });
    if (ENVIRONMENT !== "production") {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin-stats",
        status: "ok",
      });
      return;
    }
    runnings.linkedinStats = true;
    try {
      await linkedinStats.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "linkedin-stats",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
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
  "Europe/Paris"
);

// Every day at 10:00 AM
const leboncoinJob = new CronJob(
  "0 10 * * *",
  async () => {
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "leboncoin",
      status: "in_progress",
    });
    if (runnings.leboncoin || ENVIRONMENT !== "production") {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "leboncoin",
        status: "ok",
      });
      return;
    }
    runnings.leboncoin = true;
    try {
      await leboncoin.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "leboncoin",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "leboncoin",
        status: "error",
      });
    }
  },
  null,
  true,
  "Europe/Paris"
);

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
        name: "Update missions",
        schedule: missionJob.cronTime.source,
        started: missionJob.isActive,
        lastRun: missionJob.lastDate(),
        nextRun: missionJob.nextDate(),
        running: runnings.mission,
      },
      {
        name: "Update Linkedin Stats",
        schedule: linkedinStatsJob.cronTime.source,
        started: linkedinStatsJob.isActive,
        lastRun: linkedinStatsJob.lastDate(),
        nextRun: linkedinStatsJob.nextDate(),
        running: runnings.linkedinStats,
      },
      {
        name: "Update Metabase",
        schedule: metabaseJob.cronTime.source,
        started: metabaseJob.isActive,
        lastRun: metabaseJob.lastDate(),
        nextRun: metabaseJob.nextDate(),
        running: runnings.metabase,
      },
      {
        name: "Update Leboncoin",
        schedule: leboncoinJob.cronTime.source,
        started: leboncoinJob.isActive,
        lastRun: leboncoinJob.lastDate(),
        nextRun: leboncoinJob.nextDate(),
        running: runnings.leboncoin,
      },
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
