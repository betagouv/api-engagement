import { Request, Response } from "express";
import morgan from "morgan";

const SENSITIVE_FIELDS = ["password", "apikey"];

const logger = morgan<Request, Response>(
  (tokens, req, res) => {
    const user = req.user;
    const isUser = user ? "firstname" in user : false;

    const log: { [key: string]: any } = {
      method: tokens.method(req, res),
      path: req.originalUrl.split("?")[0],
      endpoint: req.route ? req.baseUrl + req.route.path : undefined,
      query: req.query,
      status: tokens.status(req, res),
      "response-time": Math.round(parseFloat(tokens["response-time"](req, res) || "0")),
    };

    if (user) {
      if (isUser) {
        log.user_id = user._id;
      } else {
        log.publisher_id = user._id;
      }
    }

    const method = tokens.method(req, res);
    if ((method === "POST" || method === "PUT") && req.body) {
      const bodyToLog = { ...req.body };

      SENSITIVE_FIELDS.forEach((field) => {
        if (bodyToLog[field]) {
          bodyToLog[field] = "****";
        }
      });

      log.body = bodyToLog;
    }

    return JSON.stringify(log);
  },
  {
    skip: (req) => req.method === "HEAD",
  }
);

export default logger;
