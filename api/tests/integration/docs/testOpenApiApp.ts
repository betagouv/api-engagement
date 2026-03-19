import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import * as OpenApiValidator from "express-openapi-validator";
import path from "path";

import bodyParserErrorHandler from "@/middlewares/body-parser-error-handler";
import passport from "@/middlewares/passport";
import MissionV0Controller from "@/v0/mission/controller";
import MyMissionV0Controller from "@/v0/mymission/controller";
import MyOrganizationV0Controller from "@/v0/myorganization/controller";
import ActivityV2Controller from "@/v2/activity";
import MissionV2WriteController from "@/v2/mission/controller";

const app = express();

app.set("trust proxy", true);
app.use(cors({ credentials: true, origin: "*" }));
app.use(bodyParser.json());
app.use(bodyParserErrorHandler);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(process.cwd(), "docs/openapi.yaml"),
    validateRequests: false,
    validateResponses: true,
    validateSecurity: false,
  })
);

app.use("/v0/myorganization", MyOrganizationV0Controller);
app.use("/v0/mymission", MyMissionV0Controller);
app.use("/v2/mission", MissionV2WriteController);
app.use("/v0/mission", MissionV0Controller);
app.use("/v2/activity", ActivityV2Controller);

app.use((err: any, req: express.Request, res: express.Response, _: express.NextFunction) => {
  console.error(err);
  res.status(500).send({ ok: false, code: "SERVER_ERROR" });
});

export { app };
