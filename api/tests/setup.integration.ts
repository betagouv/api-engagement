import { execSync } from "node:child_process";
import path from "node:path";
import net from "node:net";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { dataSubventionMock, sentryMock } from "./mocks";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL_CORE ||= "postgresql://test:test@localhost:35544/api_engagement_test_core";
process.env.DATABASE_URL_ANALYTICS ||= "postgresql://test:test@localhost:35544/api_engagement_test_analytics";
process.env.ES_ENDPOINT ||= "http://localhost:39201";

vi.mock("@sentry/node", () => ({
  default: sentryMock,
  ...sentryMock,
}));

vi.mock("../src/services/api-datasubvention", () => ({
  default: dataSubventionMock,
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  await ensureDatabasesReady();

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }

  await closeRealDatabaseConnections();
});

async function ensureDatabasesReady() {
  const projectRoot = path.resolve(__dirname, "..");
  // Ensure Postgres and Elasticsearch are reachable before attempting migrations
  try {
    const coreUrl = new URL(process.env.DATABASE_URL_CORE!);
    const pgHost = coreUrl.hostname;
    const pgPort = Number(coreUrl.port || 5432);
    await waitForTcpOpen(pgHost, pgPort, 120_000);
  } catch (e) {
    console.error("PostgreSQL did not become reachable on time.");
    throw e;
  }

  try {
    const esEndpoint = process.env.ES_ENDPOINT!;
    await waitForHttpOk(`${esEndpoint}/_cluster/health`, 60_000);
  } catch (e) {
    console.error("Elasticsearch did not become reachable on time.");
    throw e;
  }

  // Run migrations with retries to cope with Postgres starting up but not yet accepting queries
  await retry(async () => runPrismaMigrations(projectRoot), 8, 1500);

  try {
    const [postgresModule, elasticModule] = await Promise.all([import("../src/db/postgres"), import("../src/db/elastic")]);

    await Promise.all([postgresModule.pgConnected, elasticModule.esConnected]);
  } catch (error) {
    console.error("Failed to connect to PostgreSQL or Elasticsearch test services. Ensure docker-compose.test.yml is running.");
    throw error;
  }
}

async function closeRealDatabaseConnections() {
  const [postgresModule, elasticModule] = await Promise.all([import("../src/db/postgres"), import("../src/db/elastic")]);

  const closeTasks: Promise<unknown>[] = [postgresModule.prismaCore.$disconnect(), postgresModule.prismaAnalytics.$disconnect()];

  const elasticClient = elasticModule.default as { close?: () => Promise<void> | void };
  if (elasticClient.close) {
    closeTasks.push(Promise.resolve(elasticClient.close()));
  }

  await Promise.allSettled(closeTasks);
}

function runPrismaMigrations(projectRoot: string) {
  const execOptions = {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit" as const,
  };

  execSync("npx prisma migrate deploy --schema ./prisma/core/schema.core.prisma", execOptions);
}

async function retry(fn: () => void | Promise<void>, attempts: number, delayMs: number) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Operation failed after retries");
}

function waitForTcpOpen(host: string, port: number, timeoutMs: number) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ host, port });
      let done = false;
      const cleanup = () => {
        if (!done) {
          return;
        }
        socket.destroy();
      };
      socket.once("connect", () => {
        done = true;
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timeout waiting for TCP ${host}:${port}`));
        } else {
          setTimeout(tryOnce, 500);
        }
      });
      socket.setTimeout(2000, () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timeout waiting for TCP ${host}:${port}`));
        } else {
          setTimeout(tryOnce, 500);
        }
      });
    };
    tryOnce();
  });
}

async function waitForHttpOk(url: string, timeoutMs: number) {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        return;
      }
    } catch (_) {
      // ignore
    }
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`Timeout waiting for HTTP ${url}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
