import * as Sentry from "@sentry/nextjs";

import { ENV, SENTRY_DSN } from "./config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: false,
    environment: "widget-volontariat",
  });
}
