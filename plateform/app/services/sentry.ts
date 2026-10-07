import * as Sentry from "@sentry/react";
import { ENV, SENTRY_DSN } from "~/services/config";

const isSentryEnabled = ENV !== "development" && Boolean(SENTRY_DSN);

let isSentryInitialized = false;

const isAbortError = (error: unknown) => {
  return error instanceof Error && (error.name === "AbortError" || error.message.includes("signal is aborted"));
};

// Coupure réseau côté navigateur (Chrome / Safari / Firefox) : non actionnable, l'utilisateur voit déjà un message d'erreur.
const NETWORK_ERROR_MESSAGES = ["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."];

const isNetworkError = (error: unknown) => {
  return error instanceof TypeError && NETWORK_ERROR_MESSAGES.some((message) => error.message.startsWith(message));
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
  if (!isSentryEnabled || isSentryInitialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 1,
    beforeSend(event, hint) {
      if (isAbortError(hint.originalException) || isAbortError(hint.syntheticException)) {
        return null;
      }

      if (isNetworkError(hint.originalException)) {
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
