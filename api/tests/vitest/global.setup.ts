import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, StartedTestContainer } from "testcontainers";

const execFileAsync = promisify(execFile);

const API_ROOT = path.resolve(__dirname, "../..");
const CORE_DB_NAME = "core";
const POSTGRES_IMAGE = process.env.TESTCONTAINERS_POSTGRES_IMAGE || "postgres:16-alpine";
const TYPESENSE_IMAGE = "typesense/typesense:28.0";

let pgContainer: StartedPostgreSqlContainer | null = null;
let typesenseContainer: StartedTestContainer | null = null;

async function runPrismaMigrate(env: NodeJS.ProcessEnv) {
  try {
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      cwd: API_ROOT,
      env,
    });
    await execFileAsync("npm", ["run", "prisma:generate"], {
      cwd: API_ROOT,
      env,
    });

    console.log("[GlobalSetup] Prisma migrate and generate completed");
  } catch (error) {
    console.error("[GlobalSetup] Prisma migrate failed", error);
    throw error;
  }
}

export default async function globalSetup() {
  try {
    pgContainer = await new PostgreSqlContainer(POSTGRES_IMAGE).withDatabase(CORE_DB_NAME).start();
  } catch (error) {
    console.error("[GlobalSetup] Unable to start PostgreSQL test container. Ensure Docker is running and accessible.", error);
    throw error;
  }

  try {
    typesenseContainer = await new GenericContainer(TYPESENSE_IMAGE).withExposedPorts(8108).withCommand(["--data-dir", "/tmp", "--api-key=test-key", "--enable-cors"]).start();

    process.env.TYPESENSE_HOST = typesenseContainer.getHost();
    process.env.TYPESENSE_PORT = String(typesenseContainer.getMappedPort(8108));
    process.env.TYPESENSE_API_KEY = "test-key";
    console.log(`[GlobalSetup] Typesense started at ${process.env.TYPESENSE_HOST}:${process.env.TYPESENSE_PORT}`);
  } catch (error) {
    console.error("[GlobalSetup] Unable to start Typesense test container. Ensure Docker is running and accessible.", error);
    throw error;
  }

  const coreUrl = pgContainer.getConnectionUri();
  process.env.DATABASE_URL_CORE = coreUrl;

  const envForPrisma = {
    ...process.env,
    DATABASE_URL_CORE: coreUrl,
  };

  await runPrismaMigrate(envForPrisma);

  return async () => {
    if (pgContainer) {
      await pgContainer.stop();
      pgContainer = null;
    }
    if (typesenseContainer) {
      await typesenseContainer.stop();
      typesenseContainer = null;
    }
  };
}
