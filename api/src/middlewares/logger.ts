import { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import { buildAuditLog, getAuditEvents } from "@/utils/audit-log";
import { REQUEST_ID_HEADER } from "@/utils/request-id";

const SENSITIVE_FIELDS = ["password", "apikey"];

const httpLogger = morgan<Request, Response>(
  (tokens, req, res) => {
    const user = req.user as any;
    const isUser = user ? "firstname" in user : false;

    const log: { [key: string]: any } = {
      method: tokens.method(req, res),
      path: req.originalUrl.split("?")[0],
      endpoint: req.route ? req.baseUrl + req.route.path : undefined,
      query: req.query,
      request_id: (req as any).requestId ?? req.header(REQUEST_ID_HEADER),
      status: tokens.status(req, res),
      "response-time": Math.round(parseFloat(tokens["response-time"](req, res) || "0")),
    };

    if (user) {
      if (isUser) {
        log.user_id = user.id ?? undefined;
      } else {
        log.publisher_id = user.id ?? undefined;
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

export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  res.once("finish", () => {
    const events = [...getAuditEvents(req)];

    if (res.statusCode === 403) {
      events.unshift({
        action: "access.denied",
        outcome: "denied",
        target: {
          type: "route",
          id: req.route ? req.baseUrl + req.route.path : req.originalUrl.split("?")[0],
        },
      });
    }

    events.forEach((event) => {
      console.info(JSON.stringify(buildAuditLog(req, res, event)));
    });
  });

  next();
};

const logger = [auditLogger, httpLogger];

export default logger;
