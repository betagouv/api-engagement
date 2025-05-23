import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import { ENV, PORT, SENTRY_DSN } from "./config";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "jobs",
    tracesSampleRate: 0.1,
  });
}

import "./db/mongo";
import { captureException } from "./error";
import { launchJobSystem, shutdownJobs } from "./jobs";
import { setupBullBoard } from "./jobs/bull-board";

/**
 * Start the job server
 * - Initialize the job system
 * - Set up graceful shutdown handlers
 * - Start an Express server with Bull Board
 */
export function startJobServer() {
  const app = express();

  setupBullBoard(app);

  app.get("/", (req, res) => {
    res.send("Job server is running");
  });

  (async () => {
    try {
      await launchJobSystem();
      const jobServerPort = typeof PORT === "string" ? parseInt(PORT, 10) + 1 : PORT + 1; // Use a different port than the API server
      const server = app.listen(jobServerPort, () => {
        console.log(`[Job server] Job server UI is running on port ${jobServerPort}`);
        console.log(`[Job server] Bull Board is available at http://localhost:${jobServerPort}/admin/queues`);
      });

      const handleShutdown = async () => {
        console.log("[Job server] Shutting down job server gracefully");
        try {
          server.close();
          await shutdownJobs();

          console.log("[Job server] Job server shutdown complete");
          process.exit(0);
        } catch (error) {
          console.error("[Job server] Error during shutdown:", error);
          process.exit(1);
        }
      };

      process.on("SIGTERM", handleShutdown);
      process.on("SIGINT", handleShutdown);
    } catch (error) {
      console.error("Failed to initialize job system:", error);
      captureException(error);
      process.exit(1);
    }
  })();
}
