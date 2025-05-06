import * as Sentry from "@sentry/node";
import { ENV } from "./config";

export const INVALID_ID = "INVALID_ID";
export const INVALID_PARAMS = "INVALID_PARAMS";
export const INVALID_QUERY = "INVALID_QUERY";
export const INVALID_BODY = "INVALID_BODY";
export const RESSOURCE_ALREADY_EXIST = "RESSOURCE_ALREADY_EXIST";
export const REQUEST_EXPIRED = "REQUEST_EXPIRED";
export const ACCESS_DENIED = "ACCESS_DENIED";
export const FORBIDDEN = "FORBIDDEN";
export const MISSING_ELEMENT = "MISSING_ELEMENT";
export const BAD_REQUEST = "BAD_REQUEST";
export const NOT_FOUND = "NOT_FOUND";
export const SERVER_ERROR = "SERVER_ERROR";

export const captureException = (error: any, context?: string) => {
  if (context) {
    console.log(context);
  }
  if (ENV !== "development") {
    Sentry.captureException(error);
  } else {
    console.error(error);
  }
};

export const captureMessage = (message: string, context?: string) => {
  if (context) {
    console.log(context);
  }
  if (ENV !== "development") {
    Sentry.captureMessage(message);
  } else {
    console.info(message);
  }
};
