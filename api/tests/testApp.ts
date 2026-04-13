import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import CampaignController from "@/controllers/campaign";
import IframeController from "@/controllers/iframe";
import ImportController from "@/controllers/import";
import MissionController from "@/controllers/mission";
import ModerationController from "@/controllers/moderation";
import UserScoringController from "@/controllers/user-scoring";
import PublisherController from "@/controllers/publisher";
import RedirectController from "@/controllers/redirect";
import StatsController from "@/controllers/stats";
import UserController from "@/controllers/user";
import WarningController from "@/controllers/warning";
import WidgetController from "@/controllers/widget";
import bodyParserErrorHandler from "@/middlewares/body-parser-error-handler";
import passport from "@/middlewares/passport";
import requestId from "@/middlewares/request-id";
import { createHttpMetricsMiddleware, HttpMetricsRecorder } from "@/services/observability/metrics";
import MissionV0Controller from "@/v0/mission/controller";
import MyMissionV0Controller from "@/v0/mymission/controller";
import MyOrganizationV0Controller from "@/v0/myorganization/controller";
import ViewV0Controller from "@/v0/view";
import ActivityV2Controller from "@/v2/activity";
import MissionV2WriteController from "@/v2/mission/controller";

// Create a test Express app with minimal configuration
export const createTestApp = ({ metricsRecorder }: { metricsRecorder?: HttpMetricsRecorder } = {}) => {
  const app = express();

  app.set("trust proxy", true);

  // Configure middleware
  app.use(cors({ credentials: true, origin: "*" }));
  app.use(bodyParser.json());
  app.use(bodyParserErrorHandler);
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(createHttpMetricsMiddleware(metricsRecorder));
  app.use(passport.initialize());

  // Mount the controllers
  app.use("/user", UserController);
  app.use("/publisher", PublisherController);
  app.use("/campaign", CampaignController);
  app.use("/widget", WidgetController);
  app.use("/mission", MissionController);
  app.use("/moderation", ModerationController);
  app.use("/user-scoring", UserScoringController);
  app.use("/import", ImportController);
  app.use("/stats", StatsController);
  app.use("/warning", WarningController);
  app.use("/v0/myorganization", MyOrganizationV0Controller);
  app.use("/v0/mymission", MyMissionV0Controller);
  app.use("/v2/mission", MissionV2WriteController);
  app.use("/v0/mission", MissionV0Controller);
  app.use("/v0/view", ViewV0Controller);
  app.use("/r", RedirectController);
  app.use("/v2/activity", ActivityV2Controller);
  app.use("/iframe", IframeController);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, _: express.NextFunction) => {
    console.error(err);
    res.status(500).send({ ok: false, code: "SERVER_ERROR" });
  });

  return app;
};
