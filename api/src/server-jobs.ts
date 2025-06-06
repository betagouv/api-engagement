// api/src/server-jobs.ts
import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import { ENV, PORT, SENTRY_DSN } from "./config"; // Assuming this is the correct path for these configs

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "jobs", // Differentiate Sentry environment for jobs
    tracesSampleRate: 0.1,
  });
}

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import "./db/mongo";
import { redisConnection } from "./db/redis";
import { captureException } from "./error";
import { launchJobSystem, shutdownJobs } from "./jobs";
import { queues } from "./jobs/config";

/**
 * Starts the job server, which includes:
 * - Launching all configured BullMQ workers
 * - Setting up graceful shutdown handlers
 * - Starting an Express server with Bull Board UI
 */
export function startJobServer() {
  const app = express();

  // Setup BullBoard UI
  const basePath = "/admin/queues";
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  const bullMqQueues: BullMQAdapter[] = [];

  queues.forEach((queue) => {
    const queueInstance = new Queue(queue.queueName, { connection: redisConnection });
    bullMqQueues.push(new BullMQAdapter(queueInstance));
  });

  createBullBoard({
    queues: bullMqQueues,
    serverAdapter,
  });

  app.use(basePath, serverAdapter.getRouter());
  console.log(`[Job server] Bull Board UI registered at ${basePath}`);

  app.get("/", (req, res) => {
    res.send("Job server is running. Bull Board is at /admin/queues.");
  });

  (async () => {
    try {
      await launchJobSystem();

      const jobServerPort = typeof PORT === "string" ? parseInt(PORT, 10) + 1 : (PORT || 3000) + 1;
      const server = app.listen(jobServerPort, () => {
        console.log(`[Job server] Express server started on port ${jobServerPort}`);
        console.log(`[Job server] Bull Board is available at http://localhost:${jobServerPort}/admin/queues`);
      });

      const handleShutdown = async () => {
        console.log("[Job server] Received shutdown signal. Shutting down gracefully...");
        try {
          await shutdownJobs();

          server.close((err) => {
            if (err) {
              console.error("[Job server] Error closing HTTP server:", err);
              captureException(err); // Log error
              process.exit(1); // Exit with error if server doesn't close gracefully
            } else {
              console.log("[Job server] HTTP server closed.");
              console.log("[Job server] Graceful shutdown complete.");
              process.exit(0); // Successful graceful shutdown
            }
          });

          setTimeout(() => {
            console.error("[Job server] Graceful shutdown timed out. Forcing exit.");
            process.exit(1);
          }, 10000); // 10 seconds timeout
        } catch (error) {
          console.error("[Job server] Error during shutdown sequence:", error);
          captureException(error);
          process.exit(1);
        }
      };

      process.on("SIGTERM", handleShutdown);
      process.on("SIGINT", handleShutdown);
    } catch (error) {
      console.error("[Job server] Failed to initialize or start job server:", error);
      captureException(error);
      process.exit(1);
    }
  })();
}
