#!/usr/bin/env node
/**
 * CLI script to run a job manually
 * Usage: npm run job -- <job-name> <json-params> --env <env>
 * Example: npm run job -- letudiant "{\"limit\": 100}" --env staging
 */

import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Parse command-line arguments to find the environment
const args = process.argv.slice(2);
const envArgIndex = args.findIndex((arg) => arg === "--env");
let env;

if (envArgIndex !== -1 && args[envArgIndex + 1]) {
  env = args[envArgIndex + 1];
  // Remove --env and its value from the arguments array so it doesn't interfere with job arguments
  args.splice(envArgIndex, 2);
}

const envFile = env ? `.env.${env}` : null;
let envPath;
if (envFile) {
  envPath = path.resolve(__dirname, "..", "..", envFile);
}

if (envPath && fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  if (env) {
    console.log(`Warning: .env file for environment '${env}' not found. Falling back to default .env`);
  }
  dotenv.config();
}

import { ENV, SENTRY_DSN_JOBS } from "../config";
import { esConnected } from "../db/elastic";
import { mongoConnected } from "../db/mongo";

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN_JOBS,
    environment: ENV,
    tracesSampleRate: 0.1,
  });
}

const jobName = args[0];
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

const fileExtension = path.extname(__filename);
const handlerPath = path.join(jobDir, `handler${fileExtension}`);
if (!fs.existsSync(handlerPath)) {
  console.error(`Error: handler for job '${jobName}' not found`);
  process.exit(1);
}

async function runJob() {
  try {
    await Promise.all([mongoConnected, esConnected]);

    const handlerModule = await import(`./${jobName}/handler`);
    // Convert to camelCase
    // import-organizations -> ImportOrganizationsHandler
    const HandlerClassName =
      jobName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("") + "Handler";
    const HandlerClass = handlerModule[HandlerClassName];

    if (!HandlerClass || typeof HandlerClass !== "function") {
      console.error(`Error: Handler class '${HandlerClassName}' not found or not a constructor in ${handlerPath}`);
      process.exit(1);
    }

    const handler = new HandlerClass();
    if (typeof handler.handle !== "function") {
      console.error(`Error: 'handle' method not found on handler class for job '${jobName}'`);
      process.exit(1);
    }

    console.log(`Executing handler for job '${jobName}'...`);

    // Extract args from command line
    const extraArg = args[1];
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

    const result = await handler.handle(extraData);
    console.log(`Job '${jobName}' executed successfully:`, result);
  } catch (error) {
    console.error(`Error executing job '${jobName}':`, error);
  } finally {
    process.exit(0);
  }
}

runJob();
