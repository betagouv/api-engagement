import * as Sentry from "@sentry/nextjs";

import { ENV, SENTRY_DSN } from "./config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    tracesSampleRate: 1.0,
  });
}
