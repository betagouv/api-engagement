import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { ENV, SENTRY_DSN } from "./config";

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

/**
 * Start the job server
 * - Initialize the job system
 * - Set up graceful shutdown handlers
 */
export function startJobServer() {
  (async () => {
    try {
      await launchJobSystem();
    } catch (error) {
      console.error("Failed to initialize job system:", error);
      captureException(error);
      process.exit(1);
    }
  })();

  /**
   * Handle graceful shutdown
   * Shutdown all workers and
   */
  const handleShutdown = async () => {
    console.log("Shutting down job server gracefully");
    try {
      await shutdownJobs();
      console.log("Job server shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}
