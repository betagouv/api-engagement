import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const execFileAsync = promisify(execFile);

const API_ROOT = path.resolve(__dirname, "..");
const CORE_DB_NAME = "core";
const POSTGRES_IMAGE = process.env.TESTCONTAINERS_POSTGRES_IMAGE || "postgres:16-alpine";

let container: StartedPostgreSqlContainer | null = null;

async function runPrismaMigrate(schemaPath: string, env: NodeJS.ProcessEnv) {
  try {
    await execFileAsync("npx", ["prisma", "migrate", "deploy", "--schema", schemaPath], {
      cwd: API_ROOT,
      env,
    });
  } catch (error) {
    console.error(`[GlobalSetup] Prisma migrate failed for ${schemaPath}`, error);
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

  const username = container.getUsername();
  const password = container.getPassword();

  const coreUrl = container.getConnectionUri();

  process.env.DATABASE_URL_CORE = coreUrl;
  process.env.DATABASE_URL_ANALYTICS = coreUrl;

  const envForPrisma = {
    ...process.env,
    DATABASE_URL_CORE: coreUrl,
    DATABASE_URL_ANALYTICS: coreUrl,
  };

  await runPrismaMigrate("./prisma/core/schema.core.prisma", envForPrisma);

  return async () => {
    if (container) {
      await container.stop();
      container = null;
    }
  };
}
