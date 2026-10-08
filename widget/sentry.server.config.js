// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { ENV, SENTRY_DSN } from "./config";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    tracesSampleRate: 0.1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    beforeSend(event, hint) {
      // Ignore requests closed by the client before the end of the response - not actionable
      const error = hint.originalException;
      if (error?.message === "aborted" && error?.code === "ECONNRESET") {
        return null;
      }
      return event;
    },
  });
}
