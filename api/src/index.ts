import dotenv from "dotenv";
dotenv.config();

/**
 * Main entry point for the application
 * Based on the command line argument, it will start either the API server or the job server
 * We need to wait for the database connections to be established before starting the server
 */

import { esConnected, mongoConnected, redisConnected } from "./db/";
import { startApiServer } from "./server-api";
import { startJobServer } from "./server-jobs";
import { startScheduler } from "./server-scheduler";

// Determine which server to start based on the first command line argument
const serverType = process.argv[2] || "api";

async function main() {
  try {
    switch (serverType) {
      case "api":
        console.log("Waiting for database connections...");
        await Promise.all([mongoConnected, esConnected]);
        console.log("All database connections established successfully.");
        console.log("Starting API server...");
        startApiServer();
        break;

      case "jobs":
        console.log("Waiting for database connections...");
        await Promise.all([mongoConnected, redisConnected]); // Redis is required only for jobs for no
        console.log("All database connections established successfully");
        console.log("Starting job server...");
        startJobServer();
        break;

      case "scheduler":
        console.log("Waiting for database connections...");
        await Promise.all([mongoConnected, redisConnected]);
        console.log("All database connections established successfully");
        console.log("Starting scheduler...");
        startScheduler();
        break;

      default:
        console.error(`Unknown server type: ${serverType}`);
        console.log("Usage: npm start -- [api|jobs|scheduler]\nDefaulting to API server");
        startApiServer();
        break;
    }
  } catch (error) {
    console.error("Failed to establish database connections:", error);
    process.exit(1);
  }
}

main();
