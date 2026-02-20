import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import bodyParserErrorHandler from "../src/middlewares/body-parser-error-handler";
import passport from "../src/middlewares/passport";
import ModerationController from "../src/controllers/moderation";
import IframeController from "../src/controllers/iframe";
import RedirectController from "../src/controllers/redirect";
import ActivityV2Controller from "../src/v2/activity";
import MissionV0Controller from "../src/v0/mission/controller";
import MyMissionV0Controller from "../src/v0/mymission/controller";
import MyOrganizationV0Controller from "../src/v0/myorganization/controller";
import ViewV0Controller from "../src/v0/view";

// Create a test Express app with minimal configuration
export const createTestApp = () => {
  const app = express();

  app.set("trust proxy", true);

  // Configure middleware
  app.use(cors({ credentials: true, origin: "*" }));
  app.use(bodyParser.json());
  app.use(bodyParserErrorHandler);
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(passport.initialize());

  // Mount the controllers
  app.use("/moderation", ModerationController);
  app.use("/v0/myorganization", MyOrganizationV0Controller);
  app.use("/v0/mymission", MyMissionV0Controller);
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
