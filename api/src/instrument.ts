import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { ENV, IMAGE_VERSION, SENTRY_DSN_API } from "./config";

const isSentryDebugEnabled = process.env.SENTRY_DEBUG === "true";

if (SENTRY_DSN_API && ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN_API,
    environment: ENV,
    release: IMAGE_VERSION,
    integrations: [nodeProfilingIntegration],
    tracesSampleRate: ENV === "production" ? 0.1 : 1,
    profilesSampleRate: ENV === "production" ? 0.1 : 1,
    debug: isSentryDebugEnabled,
  });
} else if (!SENTRY_DSN_API) {
  console.warn("[Sentry] SENTRY_DSN_API is missing, telemetry is disabled.");
}
