#!/usr/bin/env node
/**
 * CLI script to run a job manually
 * Usage: npm run job -- <job-name> <table>
 * Example: npm run job -- export-to-analytics-raw StatEvent
 */

import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { captureException } from "../services/error";
import { postMessage } from "../services/slack";
import getJobTime from "../utils/get-job-time";

// Parse command-line arguments to find the environment
const args = process.argv.slice(2);

const envArgIndex = args.findIndex((arg) => arg === "--env");
let selectedEnv: string | undefined;

if (envArgIndex !== -1 && args[envArgIndex + 1]) {
  selectedEnv = args[envArgIndex + 1];
  args.splice(envArgIndex, 2);
}

const envFile = selectedEnv ? `.env.${selectedEnv}` : ".env";
const envPath = path.resolve(__dirname, "../../", envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  if (selectedEnv) {
    console.warn(`Warning: ${envFile} introuvable, chargement du .env par défaut.`);
  }
  dotenv.config();
}

const { SLACK_CRON_CHANNEL_ID, ENV, SENTRY_DSN_JOBS } = process.env;

if (ENV !== "development") {
  Sentry.init({
    dsn: SENTRY_DSN_JOBS,
    environment: ENV,
    tracesSampleRate: 0.1,
  });
}

const jobName = args[0];
const tableName = args[1];

if (!jobName) {
  console.error("Error: no job name provided");
  console.log("Usage: npm run job -- <job-name> <tableName>");
  process.exit(1);
}

if (!tableName) {
  console.error("Error: no table name provided");
  console.log("Usage: npm run job -- <job-name> <tableName>");
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
    const handlerModule = await import(`./${jobName}/handler`);
    // Convert to camelCase
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
    const start = new Date();

    const payload = {
      table: tableName,
    };

    const result = await handler.handle(payload);
    console.log(`Job '${jobName}' ${result.success ? "Job executed successfully" : "Job failed"}:`, result);

    const time = getJobTime(start);

    await postMessage(
      {
        title: `${handler.name} terminée en ${time}`,
        text: result.message,
        color: result.success ? "good" : "danger",
      },
      SLACK_CRON_CHANNEL_ID
    );
  } catch (error) {
    console.error(`Error executing job '${jobName}':`, error);
    captureException(error, { extra: { jobName } });
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runJob();
