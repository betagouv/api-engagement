/**
 * Main entry point for the application
 * Based on the command line argument, it will start either the API server or the job server
 * We need to wait for the database connections to be established before starting the server
 */

// Determine which server to start based on the first command line argument
const serverType = process.argv[2] || "api";

async function main() {
  try {
    switch (serverType) {
      case "api":
        const { startApiServer } = await import("./server-api");
        startApiServer();
        break;

      case "jobs":
        const { startJobServer } = await import("./server-jobs");
        startJobServer();
        break;

      case "scheduler":
        const { startScheduler } = await import("./server-scheduler");
        startScheduler();
        break;

      default:
        console.error(`Unknown server type: ${serverType}`);
        console.log("Usage: npm start -- [api|jobs|scheduler]\nDefaulting to API server");
        break;
    }
  } catch (error) {
    console.error("Failed to establish database connections:", error);
    process.exit(1);
  }
}

main();
