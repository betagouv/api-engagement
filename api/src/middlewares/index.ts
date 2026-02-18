import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Express } from "express";

import bodyParserErrorHandler from "./body-parser-error-handler";
import corsOptions from "./cors";
import helmet from "./helmet";
import logger from "./logger";
import passport from "./passport";
import requestId from "./request-id";
// import limiter from "./rate-limite";

const middlewares = (app: Express) => {
  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParserErrorHandler);
  app.use(bodyParser.text({ type: "application/x-ndjson" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet);
  app.use(requestId);
  app.use(logger);
  // app.use(limiter); // TODO: enable with correct values
  app.use(passport.initialize());
};

export default middlewares;
