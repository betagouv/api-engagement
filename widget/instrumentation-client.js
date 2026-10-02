// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Seules les variables NEXT_PUBLIC_* sont injectées dans le bundle navigateur (au build).
const ENV = process.env.NEXT_PUBLIC_ENV || "development";
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (ENV !== "development" && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
