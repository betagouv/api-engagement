import * as Sentry from "@sentry/react";
import { isRouteErrorResponse, type ClientOnErrorFunction } from "react-router";
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
    sendDefaultPii: false,
    initialScope: { tags: { runtime: "client", service: "plateform" } },
    tracesSampleRate: ENV === "production" ? 0.1 : 1,
    beforeSend(event, hint) {
      if (isAbortError(hint.originalException) || isAbortError(hint.syntheticException)) {
        return null;
      }

      if (isNetworkError(hint.originalException)) {
        return null;
      }

      event.tags = { ...event.tags, runtime: "client", service: "plateform" };
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
    Sentry.captureException(normalizedError, { tags: { runtime: "client", service: "plateform" }, extra });
    return;
  }

  Sentry.captureException(normalizedError, { tags: { runtime: "client", service: "plateform" } });
};

// React Router appelle ce callback indépendamment du rendu de l'ErrorBoundary.
export const handleRouterError: ClientOnErrorFunction = (error, { pattern, errorInfo }) => {
  if (isAbortError(error) || (isRouteErrorResponse(error) && error.status === 404)) return;

  const routeError = isRouteErrorResponse(error) ? error : undefined;
  const reportedError = routeError ? new Error(`Route error ${routeError.status} ${routeError.statusText}`) : normalizeError(error);
  // Le pattern ne contient pas les valeurs des paramètres. Ne pas transmettre
  // location, params ou error.data, qui peuvent contenir des données personnelles.
  const extra = {
    pattern,
    componentStack: errorInfo?.componentStack,
    ...(routeError ? { status: routeError.status, statusText: routeError.statusText } : {}),
  };

  // captureException journalise déjà les erreurs en développement.
  if (ENV !== "development") console.error("[Sentry] Router error", reportedError, extra);
  captureException(reportedError, extra);
};
