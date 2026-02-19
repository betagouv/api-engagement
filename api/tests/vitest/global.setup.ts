import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const execFileAsync = promisify(execFile);

const API_ROOT = path.resolve(__dirname, "../..");
const CORE_DB_NAME = "core";
const POSTGRES_IMAGE = process.env.TESTCONTAINERS_POSTGRES_IMAGE || "postgres:16-alpine";

let container: StartedPostgreSqlContainer | null = null;

async function runPrismaMigrate(env: NodeJS.ProcessEnv) {
  try {
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      cwd: API_ROOT,
      env,
    });
  } catch (error) {
    console.error("[GlobalSetup] Prisma migrate failed", error);
    throw error;
  }
}

export default async function globalSetup() {
  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).withDatabase(CORE_DB_NAME).start();
  } catch (error) {
    console.error("[GlobalSetup] Unable to start PostgreSQL test container. Ensure Docker is running and accessible.", error);
    throw error;
  }

  const coreUrl = container.getConnectionUri();

  process.env.DATABASE_URL_CORE = coreUrl;

  const envForPrisma = {
    ...process.env,
    DATABASE_URL_CORE: coreUrl,
  };

  await runPrismaMigrate(envForPrisma);

  return async () => {
    if (container) {
      await container.stop();
      container = null;
    }
  };
}
