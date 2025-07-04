import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";

import { ENV, PORT, SENTRY_DSN } from "./config"; // Assuming this is the correct path for these configs
import { mongoConnected } from "./db/mongo";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "jobs", // Differentiate Sentry environment for jobs
    tracesSampleRate: 0.1,
  });
}

import "./db/mongo";

/**
 * Starts the job server.
 * A dummy express server is started to handle health checks, but no endpoint is exposed.
 */
export const startJobServer = async () => {
  console.log("[Job server] Waiting for database connections...");
  await Promise.all([mongoConnected]);
  console.log("[Job server] All database connections established successfully");
  console.log("[Job server] Starting job server...");

  const app = express();

  app.get("/", (req, res) => {
    res.send("Job server is running.");
  });

  app.listen(PORT, () => console.log(`[Job server] Running on port ${PORT}`));
};
