#!/usr/bin/env node
/**
 * Script CLI pour exu00e9cuter directement les handlers de jobs
 * Usage: npm run job:<nom-du-job>
 * Exemple: npm run job:letudiant
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Charger les variables d'environnement
dotenv.config();

// Ru00e9cupu00e9rer le nom du job depuis les arguments
const jobName = process.argv[2];

if (!jobName) {
  console.error("Error: no job name provided");
  console.log("Usage: npm run job -- <job-name>");
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
    const handlerModule = await import(`./${jobName}/handler`);

    if (!handlerModule.handler || typeof handlerModule.handler !== "function") {
      console.error(`Error: handler function not found in ${handlerPath}`);
      process.exit(1);
    }

    console.log(`Executing handler for job '${jobName}'...`);

    // Fake job to emulate BullMQ job
    const fakeJob = {
      id: `manual-${Date.now()}`,
      name: `manual-${jobName}`,
      data: { manualExecution: true, timestamp: Date.now() },
    };

    const result = await handlerModule.handler(fakeJob);
    console.log(`Job '${jobName}' executed successfully:`, result);
  } catch (error) {
    console.error(`Error executing job '${jobName}':`, error);
  } finally {
    process.exit(0);
  }
}

runJob();
