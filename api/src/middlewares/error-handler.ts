import * as Sentry from "@sentry/node";
import { NextFunction, Request, Response } from "express";
import { ENV } from "../config";
import { SERVER_ERROR, captureException } from "../error";
import { REQUEST_ID_HEADER } from "../utils/request-id";

const errorHandler = (err: any, req: Request, res: Response, _: NextFunction) => {
  try {
    console.log(`Error on request ${req.method} ${req.url}`);
    console.error(err);

    // Filter out socket hang up errors from Sentry reporting
    const isSocketHangUp = err.code === "ECONNRESET" || (err.message && err.message.includes("socket hang up"));

    if (ENV !== "development" && !isSocketHangUp) {
      Sentry.withScope((scope) => {
        const requestId = (req as any).requestId ?? req.header(REQUEST_ID_HEADER);
        if (requestId) {
          scope.setTag("request_id", requestId);
        }
        captureException(err);
      });
    } else {
      console.error(err);
    }

    res.status(500).send({ ok: false, code: SERVER_ERROR });
  } catch (error) {
    captureException(error);
  }
};

export default errorHandler;
