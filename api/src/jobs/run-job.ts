#!/usr/bin/env node
/**
 * CLI script to run a job manually
 * Usage: npm run job -- <job-name>
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

import "../db/mongo";
import { mongoConnected } from "../db/mongo";

const jobName = process.argv[2];
if (!jobName) {
  console.error("Error: no job name provided");
  console.log('Usage: npm run job -- <job-name> \'{"key":"value"}\'');
  process.exit(1);
}

const jobDir = path.join(__dirname, jobName);
if (!fs.existsSync(jobDir)) {
  console.error(`Error: job directory '${jobName}' not found`);
  process.exit(1);
}

const handlerPath = path.join(jobDir, "handler.ts");
if (!fs.existsSync(handlerPath)) {
  console.error(`Error: handler for job '${jobName}' not found`);
  process.exit(1);
}

async function runJob() {
  try {
    await Promise.all([mongoConnected]);

    const handlerModule = await import(`./${jobName}/handler`);

    const HandlerClassName = jobName.charAt(0).toUpperCase() + jobName.slice(1) + "Handler";
    const HandlerClass = handlerModule[HandlerClassName];

    if (!HandlerClass || typeof HandlerClass !== "function") {
      console.error(`Error: Handler class '${HandlerClassName}' not found or not a constructor in ${handlerPath}`);
      process.exit(1);
    }

    const handlerInstance = new HandlerClass();

    if (typeof handlerInstance.handle !== "function") {
      console.error(`Error: 'handle' method not found on handler instance for job '${jobName}'`);
      process.exit(1);
    }

    console.log(`Executing handler for job '${jobName}'...`);

    // Extract args from command line and create fake BullMQ job
    const extraArg = process.argv[3];
    let extraData: Record<string, any> = {};

    if (extraArg && extraArg.startsWith("{")) {
      try {
        extraData = JSON.parse(extraArg);
      } catch (e) {
        console.error("Invalid JSON parameters", e);
        process.exit(1);
      }
    } else if (extraArg) {
      console.error("Invalid JSON parameters");
      process.exit(1);
    }

    const fakeJob = {
      id: `manual-${Date.now()}`,
      name: `manual-${jobName}`,
      data: {
        manualExecution: true,
        timestamp: Date.now(),
        ...extraData,
      },
    } as any; // Cast to any to satisfy BullMQ Job type if needed, or define a simpler type

    const result = await handlerInstance.handle(fakeJob);
    console.log(`Job '${jobName}' executed successfully:`, result);
  } catch (error) {
    console.error(`Error executing job '${jobName}':`, error);
  } finally {
    process.exit(0);
  }
}

runJob();
