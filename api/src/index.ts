import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { ENV, PORT, SENTRY_DSN_API } from "./config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN_API,
    environment: ENV,
    tracesSampleRate: 0.1,
  });
}

import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import path from "path";

import { SERVER_ERROR, captureException } from "./error";

import { pgConnectedCore, pgDisconnect } from "./db/postgres";
import middlewares from "./middlewares";

import AdminReportController from "./controllers/admin-report";
import BrevoWebhookController from "./controllers/brevo-webhook/controller";
import CampaignController from "./controllers/campaign";
import IframeController from "./controllers/iframe";
import ImportController from "./controllers/import";
import MetabaseController from "./controllers/metabase";
import MissionController from "./controllers/mission";
import ModerationController from "./controllers/moderation";
import ModerationEventController from "./controllers/moderation-event";
import OrganizationController from "./controllers/organization";
import PublisherController from "./controllers/publisher";
import RedirectController from "./controllers/redirect";
import ReportController from "./controllers/report";
import StatsController from "./controllers/stats";
import StatsMeanController from "./controllers/stats-mean/controller";
import UserController from "./controllers/user";
import WarningController from "./controllers/warning";
import WarningBotController from "./controllers/warning-bot";
import WidgetController from "./controllers/widget";
import MissionV0Controller from "./v0/mission/controller";
import MyMissionV0Controller from "./v0/mymission/controller";
import MyOrganizationV0Controller from "./v0/myorganization/controller";
import OrganizationV0Controller from "./v0/organization";
import PublisherV0Controller from "./v0/publisher";
import ViewV0Controller from "./v0/view";
import AssociationV1Controller from "./v1/association";
import ActivityV2Controller from "./v2/activity";
import JobTeaserV2Controller from "./v2/jobteaser";
import LeboncoinV2Controller from "./v2/leboncoin";

const main = async () => {
  console.log("[API] Waiting for database connections...");
  await pgConnectedCore();

  console.log("[API] Starting API server...");

  const app = express();
  const start = new Date();

  middlewares(app);

  app.get("/", async (req, res) => {
    res.status(200).send(`API Engagement is running since ${start}`);
  });
  app.get("/impression.js", async (req, res) => {
    res.sendFile(path.join(__dirname, "static/impression.js"));
  });

  // Opened routes
  app.use("/iframe", IframeController);
  app.use("/r", cors({ origin: "*" }), RedirectController);
  app.use("/report", cors({ origin: "*" }), ReportController);
  app.use("/v0/mymission", cors({ origin: "*" }), MyMissionV0Controller);
  app.use("/v0/myorganization", cors({ origin: "*" }), MyOrganizationV0Controller);
  app.use("/v0/mission", cors({ origin: "*" }), MissionV0Controller);
  app.use("/v0/publisher", cors({ origin: "*" }), PublisherV0Controller);
  app.use("/v0/view", cors({ origin: "*" }), ViewV0Controller);
  app.use("/v0/organization", OrganizationV0Controller);
  app.use("/v1/association", AssociationV1Controller);
  // /v2/mission redirects to /v0/mission
  app.use("/v2/mission", cors({ origin: "*" }), MissionV0Controller);
  app.use("/v2/activity", cors({ origin: "*" }), ActivityV2Controller);
  app.use("/v2/leboncoin", cors({ origin: "*" }), LeboncoinV2Controller);
  app.use("/v2/jobteaser", cors({ origin: "*" }), JobTeaserV2Controller);
  app.use("/brevo-webhook", cors({ origin: "*" }), BrevoWebhookController);

  // Interal routes
  app.use("/admin-report", AdminReportController);
  app.use("/campaign", CampaignController);
  app.use("/import", ImportController);
  app.use("/mission", MissionController);
  app.use("/moderation", ModerationController);
  app.use("/moderation-event", ModerationEventController);
  app.use("/metabase", MetabaseController);
  app.use("/publisher", PublisherController);
  app.use("/organization", OrganizationController);
  app.use("/stats", StatsController);
  app.use("/stats-mean", StatsMeanController);
  app.use("/user", UserController);
  app.use("/warning", WarningController);
  app.use("/warning-bot", WarningBotController);
  app.use("/widget", WidgetController);

  app.use(async (err: any, req: Request, res: Response, _: NextFunction) => {
    try {
      console.log(`Error on request ${req.method} ${req.url}`);
      console.error(err);

      // Filter out socket hang up errors from Sentry reporting
      const isSocketHangUp = err.code === "ECONNRESET" || (err.message && err.message.includes("socket hang up"));

      if (ENV !== "development" && !isSocketHangUp) {
        captureException(err);
      } else {
        console.error(err);
      }

      res.status(500).send({ ok: false, code: SERVER_ERROR });
    } catch (error) {
      captureException(error);
    }
  });

  const server = app.listen(PORT, () => console.log(`[API] Running on port ${PORT} at ${new Date().toISOString()}`));

  let isShuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`[API] Received ${signal}, shutting down...`);

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    await pgDisconnect();
    console.log("[API] Shutdown complete");
    process.exit(0);
  };

  (["SIGTERM", "SIGINT"] as NodeJS.Signals[]).forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error("[API] Shutdown error:", error);
        process.exit(1);
      });
    });
  });
};

main();
