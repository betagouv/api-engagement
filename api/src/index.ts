import dotenv from "dotenv";
dotenv.config();

/**
 * Main entry point for the application
 * Based on the command line argument, it will start either the API server or the job server
 */

import { mongoConnected } from "./db/mongo";
import { redisConnected } from "./db/redis";
import { startApiServer } from "./server-api";
import { startJobServer } from "./server-jobs";

// Determine which server to start based on the first command line argument
const serverType = process.argv[2] || "api";

async function main() {
  try {
    console.log("Waiting for database connections...");
    await Promise.all([mongoConnected, redisConnected]);
    console.log("All database connections established successfully");

    switch (serverType) {
      case "api":
        console.log("Starting API server...");
        startApiServer();
        break;
      case "jobs":
        console.log("Starting job server...");
        startJobServer();
        break;
      default:
        console.error(`Unknown server type: ${serverType}`);
        console.log("Usage: npm start -- [api|jobs]\nDefaulting to API server");
        startApiServer();
        break;
    }
  } catch (error) {
    console.error("Failed to establish database connections:", error);
    process.exit(1);
  }
}

main();
