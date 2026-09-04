import * as Sentry from "@sentry/react";
import { ENV, SENTRY_DSN } from "~/services/config";

const sentryDsn = SENTRY_DSN?.trim();
const isSentryEnabled = ENV !== "development" && Boolean(sentryDsn);

let isSentryInitialized = false;

const isAbortError = (error: unknown) => {
  return error instanceof Error && (error.name === "AbortError" || error.message.includes("signal is aborted"));
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error("Unknown error");
  }
};

export const initSentry = () => {
  if (!isSentryEnabled || isSentryInitialized || !sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 1,
    beforeSend(event, hint) {
      if (isAbortError(hint.originalException) || isAbortError(hint.syntheticException)) {
        return null;
      }

      return event;
    },
  });

  isSentryInitialized = true;
};

export const captureException = (error: unknown, extra?: Record<string, unknown>) => {
  if (ENV === "development") {
    console.error("[Sentry] Error", error);
    if (extra) console.error("[Sentry] Context", extra);
    return;
  }

  if (!isSentryEnabled) return;

  const normalizedError = normalizeError(error);
  if (extra) {
    Sentry.captureException(normalizedError, { extra });
    return;
  }

  Sentry.captureException(normalizedError);
};
