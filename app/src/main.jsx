import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";

import ReactDOM from "react-dom/client";

import "react-day-picker/dist/style.css";
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
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
