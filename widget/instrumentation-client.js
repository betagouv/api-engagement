// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { PUBLIC_ENV, PUBLIC_SENTRY_DSN } from "./config";

// Network failures on the browser side (Chrome / Safari / Firefox) - not actionable
const NETWORK_ERROR_MESSAGES = ["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."];

if (PUBLIC_ENV !== "development" && PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    environment: PUBLIC_ENV,
    // Only report errors thrown by our own scripts (widget + jstag.js), not by browser extensions or third-party scripts
    allowUrls: [/api-engagement\.beta\.gouv\.fr/, /api-engagement-dev\.fr/],
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof TypeError && NETWORK_ERROR_MESSAGES.some((message) => error.message.startsWith(message))) {
        return null;
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
