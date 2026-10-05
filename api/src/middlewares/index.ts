import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Express } from "express";

import bodyParserErrorHandler from "@/middlewares/body-parser-error-handler";
import { corsOptions } from "@/middlewares/cors";
import helmet from "@/middlewares/helmet";
import logger from "@/middlewares/logger";
import passport from "@/middlewares/passport";
import requestId from "@/middlewares/request-id";
import { createHttpMetricsMiddleware } from "@/services/observability/metrics";

const middlewares = (app: Express) => {
  app.set("trust proxy", 1);
  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParserErrorHandler);
  app.use(bodyParser.text({ type: "application/x-ndjson" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet);
  app.use(requestId);
  app.use(createHttpMetricsMiddleware());
  app.use(logger);
  app.use(passport.initialize());
};

export default middlewares;
