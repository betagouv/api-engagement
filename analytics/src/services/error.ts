import * as Sentry from "@sentry/node";

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

export const captureException = (error: any, context?: string | { extra: any }) => {
  if (process.env.ENV === "development") {
    if (context) {
      console.log("[Sentry] Context", context);
    }
    console.log("[Sentry] Capture exception", error);
    return;
  }

  if (typeof context === "object" && "extra" in context) {
    const extra: Record<string, string> = {};
    for (const [key, value] of Object.entries(context.extra)) {
      if (typeof value !== "string") {
        extra[key] = JSON.stringify(value);
      } else {
        extra[key] = value;
      }
    }
    context.extra = extra;
    Sentry.captureException(error, {
      extra: context.extra,
    });
  } else {
    if (context) {
      console.log("[Sentry] Context", context);
    }
    Sentry.captureException(error);
  }
};

export const captureMessage = (message: string, context?: string | { extra: any }) => {
  if (process.env.ENV === "development") {
    if (context) {
      console.log("[Sentry] Context", context);
    }
    console.log("[Sentry] Capture message", message);
    return;
  }

  if (typeof context === "object" && "extra" in context) {
    const extra: Record<string, string> = {};
    for (const [key, value] of Object.entries(context.extra)) {
      if (typeof value !== "string") {
        extra[key] = JSON.stringify(value);
      } else {
        extra[key] = value;
      }
    }
    context.extra = extra;
    Sentry.captureMessage(message, {
      extra: context.extra,
    });
  } else {
    if (context) {
      console.log("[Sentry] Context", context);
    }
    Sentry.captureMessage(message);
  }
};
