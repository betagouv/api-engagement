import { Request, Response } from "express";
import morgan from "morgan";

const SENSITIVE_FIELDS = ["password", "apikey"];

const logger = morgan<Request, Response>((tokens, req, res) => {
  const user = req.user;
  const isUser = user ? "firstname" in user : false;

  const log: { [key: string]: any } = {
    method: tokens.method(req, res),
    path: req.path,
    query: req.query,
    status: tokens.status(req, res),
    "response-time": tokens["response-time"](req, res),
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
});

export default logger;
