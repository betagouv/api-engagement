import { execSync } from "node:child_process";
import path from "node:path";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { dataSubventionMock, sentryMock } from "./mocks";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL_CORE ||= "postgresql://test:test@localhost:5544/api_engagement_test_core";
process.env.ES_ENDPOINT ||= "http://localhost:9201";

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
  try {
    runPrismaMigrations(projectRoot);
  } catch (error) {
    console.error("Failed to apply Prisma migrations for the docker-compose test databases. Did you run docker-compose.test.yml?");
    throw error;
  }

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
