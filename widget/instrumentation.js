import * as Sentry from "@sentry/nextjs";

const normalizeError = (value) => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
};

const captureLifecycleError = (event, value, extra = {}) => {
  const error = normalizeError(value);

  Sentry.withScope((scope) => {
    scope.setTag("event", event);

    Object.entries(extra).forEach(([key, val]) => {
      scope.setExtra(key, val);
    });

    Sentry.captureException(error);
  });
};

const registerLifecycleHooks = () => {
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    captureLifecycleError("uncaught_exception", error, { origin });
  });

  process.on("unhandledRejection", (reason) => {
    captureLifecycleError("unhandled_rejection", reason);
  });
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    registerLifecycleHooks();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
