import * as Sentry from "@sentry/node";
import { Prisma } from "@prisma/client";

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

type PrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientRustPanicError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientValidationError;

const safeStringify = (value: unknown): string => {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizeExtra = (extra: Record<string, unknown>) =>
  Object.entries(extra).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = safeStringify(value);
    return acc;
  }, {});

const isPrismaError = (error: unknown): error is PrismaError =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  error instanceof Prisma.PrismaClientUnknownRequestError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  error instanceof Prisma.PrismaClientInitializationError ||
  error instanceof Prisma.PrismaClientValidationError;

const buildPrismaExtra = (error: PrismaError): Record<string, string> => {
  const extra: Record<string, string> = {
    prismaErrorType: error.constructor.name,
    prismaMessage: error.message,
    prismaClientVersion: error.clientVersion ?? "unknown",
  };

  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError) {
    extra.prismaCode = error.code;
    if (error.meta) {
      extra.prismaMeta = safeStringify(error.meta);
    }
  }

  return extra;
};

const extractContextExtra = (context?: string | { extra: Record<string, unknown> }) => {
  if (typeof context === "string") {
    return { contextMessage: context };
  }
  if (context && typeof context === "object" && "extra" in context && context.extra) {
    return normalizeExtra(context.extra);
  }
  return undefined;
};

export const captureException = (error: any, context?: string | { extra: Record<string, unknown> }) => {
  const prismaExtra = isPrismaError(error) ? buildPrismaExtra(error) : undefined;
  const contextExtra = extractContextExtra(context);
  const mergedExtra = { ...(contextExtra ?? {}), ...(prismaExtra ?? {}) };
  const hasExtra = Object.keys(mergedExtra).length > 0;

  if (ENV === "development") {
    if (context) {
      console.log("[Sentry] Context", context);
    }
    if (prismaExtra) {
      console.log("[Sentry] Prisma extra", prismaExtra);
    }
    console.log("[Sentry] Capture exception", error);
    return;
  }

  if (hasExtra) {
    Sentry.captureException(error, {
      extra: mergedExtra,
    });
  } else {
    Sentry.captureException(error);
  }
};

export const captureMessage = (message: string, context?: string | { extra: any }) => {
  if (ENV === "development") {
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
      console.log("[Sentry] Context", message);
    }
    Sentry.captureMessage(message);
  }
};
