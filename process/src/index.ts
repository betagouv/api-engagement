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
import leboncoin from "./jobs/leboncoin";
import linkedin from "./jobs/linkedin";
import linkedinStats from "./jobs/linkedin-stats";
import metabase from "./jobs/metabase";
import organization from "./jobs/organization";
import warnings from "./jobs/warnings";
import { captureException } from "./error";
import report from "./jobs/report";
import kpi from "./jobs/kpi";
import brevo from "./jobs/brevo";

const app = express();

const runnings = {
  mission: false,
  linkedin: false,
  linkedinStats: false,
  metabase: false,
  leboncoin: false,
  organization: false,
  report: false,
  kpi: false,
  brevo: false,
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
// Every day at 1:30 AM
const kpiJob = new CronJob(
  "30 1 * * *",
  async () => {
    if (runnings.kpi) return;
    runnings.kpi = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "kpi",
      status: "in_progress",
    });
    try {
      await kpi.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "kpi",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "kpi",
        status: "error",
      });
    }
    runnings.kpi = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every day at 1 AM
const brevoJob = new CronJob(
  "0 1 * * *",
  async () => {
    if (runnings.brevo) return;
    runnings.brevo = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "brevo",
      status: "in_progress",
    });
    try {
      await brevo.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "brevo",
        status: "ok",
      });
    } catch (error) {
      captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "brevo",
        status: "error",
      });
    }
    runnings.brevo = false;
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
const organizationJob = new CronJob(
  "0 0 2 * *",
  async () => {
    runnings.organization = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "organization",
      status: "in_progress",
    });
    try {
      await organization.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "organization",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "organization",
        status: "error",
      });
    }
    runnings.organization = false;
  },
  null,
  true,
  "Europe/Paris",
);

// Every day at 10:00 AM
const leboncoinJob = new CronJob(
  "0 10 * * *",
  async () => {
    if (runnings.leboncoin) return;
    runnings.leboncoin = true;
    const checkInId = Sentry.captureCheckIn({
      monitorSlug: "leboncoin",
      status: "in_progress",
    });
    try {
      await leboncoin.handler();
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "leboncoin",
        status: "ok",
      });
    } catch (error) {
      Sentry.captureException(error);
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "leboncoin",
        status: "error",
      });
    }
  },
  null,
  true,
  "Europe/Paris",
);

// Every first Tuesday of the month at 10:00 AM
const reportJob = new CronJob(
  // "0 10 * * 2",
  "0 10 * * 4",
  async () => {
    // if not the first Tuesday of the month, return
    const date = new Date();
    // if (date.getDay() !== 2 || date.getDate() > 7) return;
    if (date.getDay() !== 4 || date.getDate() > 7) return; // Temporary to Thursday

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
        name: "Update Organization",
        schedule: organizationJob.cronTime.source,
        started: organizationJob.running,
        lastRun: organizationJob.lastDate(),
        nextRun: organizationJob.nextDate(),
        running: runnings.organization,
      },
      {
        name: "Update Leboncoin",
        schedule: leboncoinJob.cronTime.source,
        started: leboncoinJob.running,
        lastRun: leboncoinJob.lastDate(),
        nextRun: leboncoinJob.nextDate(),
        running: runnings.leboncoin,
      },
      {
        name: "Generate reports",
        schedule: reportJob.cronTime.source,
        started: reportJob.running,
        lastRun: reportJob.lastDate(),
        nextRun: reportJob.nextDate(),
        running: runnings.report,
      },
      {
        name: "Generate KPI",
        schedule: kpiJob.cronTime.source,
        started: kpiJob.running,
        lastRun: kpiJob.lastDate(),
        nextRun: kpiJob.nextDate(),
        running: runnings.kpi,
      },
      {
        name: "Sync Brevo",
        schedule: brevoJob.cronTime.source,
        started: brevoJob.running,
        lastRun: brevoJob.lastDate(),
        nextRun: brevoJob.nextDate(),
        running: runnings.brevo,
      },
    ];

    res.status(200).send({ ok: true, data: tasks });
  } catch (error) {
    captureException(error);
    res.status(500).send({ ok: false, code: "SERVER ERROR" });
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT} at ${new Date().toISOString()}`));
