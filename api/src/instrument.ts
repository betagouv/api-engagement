import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { ENV, IMAGE_VERSION, SENTRY_DSN_API } from "./config";

const isSentryDebugEnabled = process.env.SENTRY_DEBUG === "true";

if (SENTRY_DSN_API && ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN_API,
    environment: ENV,
    release: IMAGE_VERSION,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: ENV === "production" ? 0.1 : 1,
    profileSessionSampleRate: ENV === "production" ? 0.1 : 1,
    profileLifecycle: "trace",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
        response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      genAI: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false },
    },
    debug: isSentryDebugEnabled,
  });
} else if (!SENTRY_DSN_API) {
  console.warn("[Sentry] SENTRY_DSN_API is missing, telemetry is disabled.");
}
