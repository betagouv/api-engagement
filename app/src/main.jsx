import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";

import ReactDOM from "react-dom/client";

import "react-toastify/dist/ReactToastify.css";
import "react-tooltip/dist/react-tooltip.css";

import App from "./App";
import "./index.css";
import { ENV, SENTRY_DSN } from "./services/config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration(),
    ],
    environment: ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Ignore AbortError - these are expected when requests are cancelled
      const error = hint.originalException || hint.syntheticException;
      if (error && (error.name === "AbortError" || error.message?.includes("signal is aborted"))) {
        return null;
      }
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
