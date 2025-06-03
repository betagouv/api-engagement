import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Express } from "express";
import morgan from "morgan";

import corsOptions from "./cors";
import helmet from "./helmet";
import passport from "./passport";
import limiter from "./rate-limite";

const middlewares = (app: Express) => {
  app.use(limiter);

  app.use(cors(corsOptions));

  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.text({ type: "application/x-ndjson" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(":date[iso] :method :url :status :res[content-length] - :response-time ms"));
  app.use(helmet);
  app.use(passport.initialize());
};

export default middlewares;
