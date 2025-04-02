import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { ADMIN_SNU_URL, APP_URL, ASSOCIATION_URL, BENEVOLAT_URL, ENV, JVA_URL, PORT, SENTRY_DSN, VOLONTARIAT_URL } from "./config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "api",
    tracesSampleRate: 0.1,
  });
}

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import "./db/mongo";
import { SERVER_ERROR, captureException, captureMessage } from "./error";
import passport from "./services/passport";

import AdminReportController from "./controllers/admin-report";
import BrevoWebhookController from "./controllers/brevo-webhook";
import CampaignController from "./controllers/campaign";
import IframeController from "./controllers/iframe";
import ImportController from "./controllers/import";
import MissionController from "./controllers/mission";
import ModerationController from "./controllers/moderation";
import ModerationEventController from "./controllers/moderation-event";
import OrganizationController from "./controllers/organization";
import PublisherController from "./controllers/publisher";
import RedirectController from "./controllers/redirect";
import ReportController from "./controllers/report";
import StatsController from "./controllers/stats";
import StatsAdminController from "./controllers/stats-admin";
import StatsCompareController from "./controllers/stats-compare";
import StatsGlobalController from "./controllers/stats-global";
import StatsMeanController from "./controllers/stats-mean";
import StatsMissionController from "./controllers/stats-mission";
import PublicStatsController from "./controllers/stats-public";
import UserController from "./controllers/user";
import WarningController from "./controllers/warning";
import WidgetController from "./controllers/widget";
import AssociationV0Controller from "./v0/association";
import MissionV0Controller from "./v0/mission";
import MyMissionV0Controller from "./v0/mymission";
import OrganizationV0Controller from "./v0/organization";
import PublisherV0Controller from "./v0/publisher";
import ViewV0Controller from "./v0/view";
import AssociationV1Controller from "./v1/association";
import ActivityV2Controller from "./v2/activity";
import JobTeaserV2Controller from "./v2/jobteaser";
import LeboncoinV2Controller from "./v2/leboncoin";
import MissionV2Controller from "./v2/mission";

const app = express();
const start = new Date();

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

const origin = [
  APP_URL,
  ASSOCIATION_URL,
  VOLONTARIAT_URL,
  BENEVOLAT_URL,
  JVA_URL,
  ADMIN_SNU_URL,
  // SNU admin staging
  "https://app-735c50af-69c1-4a10-ac30-7ba11d1112f7.cleverapps.io",
  "https://app-ec11b799-95d0-4770-8e41-701b4becf64a.cleverapps.io",
];
// Configure express
app.use(cors({ credentials: true, origin }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.text({ type: "application/x-ndjson" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(":date[iso] :method :url :status :res[content-length] - :response-time ms"));
app.use(passport.initialize());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://plausible.io"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        frameAncestors: ["'self'", "https://generation.paris2024.org"],
      },
    },
    crossOriginOpenerPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
    noSniff: true,
  }),
);

app.get("/", async (req, res) => {
  res.status(200).send(`API Engagement is running since ${start}`);
});
app.get("/impression.js", async (req, res) => {
  res.sendFile(path.join(__dirname, "static/impression.js"));
});

// Opened routes
app.use("/iframe", IframeController);
app.use("/stats-public", PublicStatsController);
app.use("/r", cors({ origin: "*" }), RedirectController);
app.use("/report", cors({ origin: "*" }), ReportController);
app.use("/v0/mymission", cors({ origin: "*" }), MyMissionV0Controller);
// app.use("/v0/myorganization", cors({ origin: "*" }), MyOrganisationV0Controller);
app.use("/v0/mission", cors({ origin: "*" }), MissionV0Controller);
app.use("/v0/publisher", cors({ origin: "*" }), PublisherV0Controller);
app.use("/v0/view", cors({ origin: "*" }), ViewV0Controller);
app.use("/v0/association", AssociationV0Controller);
app.use("/v0/organization", OrganizationV0Controller);
app.use("/v1/association", AssociationV1Controller);
app.use("/v2/mission", cors({ origin: "*" }), MissionV2Controller);
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
app.use("/publisher", PublisherController);
app.use("/organization", OrganizationController);
app.use("/stats", StatsController);
app.use("/stats-admin", StatsAdminController);
app.use("/stats-compare", StatsCompareController);
app.use("/stats-global", StatsGlobalController);
app.use("/stats-mean", StatsMeanController);
app.use("/stats-mission", StatsMissionController);
app.use("/user", UserController);
app.use("/warning", WarningController);
app.use("/widget", WidgetController);

app.get("/geo", async (req: Request, res: Response, next) => {
  try {
    captureMessage(`Fetching geo is still used`);
    const url = encodeURI(`https://api-adresse.data.gouv.fr/search/?q=${req.query.postcode}&type=municipality`);
    const r = await fetch(url).then((response) => response.json());
    res.status(200).send(r);
  } catch (error) {
    next(error);
  }
});

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

app.listen(PORT, () => console.log(`API is running on port ${PORT} at ${new Date()}`));
