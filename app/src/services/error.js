import * as Sentry from "@sentry/react";
import { toast } from "./toast";
import { ENV } from "./config";

export const captureError = (error, context = { message: "Une erreur est survenue" }, toastOptions = {}) => {
  // Ignore AbortError - these are expected when requests are cancelled
  if (error && (error.name === "AbortError" || error.message?.includes("signal is aborted"))) {
    console.log("[Sentry] AbortError ignored");
    return;
  }

  if (error && error.status === 401) {
    console.log("[Sentry] Deconnexion");
    return;
  }

  // Only show toast if a message is provided
  if (context.message) {
    toast.error(context.message, toastOptions);
  }

  if (ENV === "development") {
    console.log("[Sentry] Context", context);
    console.log("[Sentry] Error", JSON.stringify(error, null, 2));
    return;
  }

  if (context.extra) {
    const extra = {};
    for (const [key, value] of Object.entries(context.extra)) {
      if (typeof value !== "string") extra[key] = JSON.stringify(value);
      else extra[key] = value;
    }
    context.extra = extra;
  }

  if (error && error.status === 400) {
    Sentry.captureException(new Error("Bad Request"), { ...context, extra: { ...context.extra, error } });
    return;
  }

  if (error && error.status === 403) {
    Sentry.captureMessage(new Error("Forbidden"), { ...context, extra: { ...context.extra, error } });
    return;
  }

  Sentry.captureException(new Error("Unknown Error"), { ...context, extra: { ...context.extra, error } });
};
