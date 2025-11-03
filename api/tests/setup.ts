import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { dataSubventionMock, elasticMock, sentryMock } from "./mocks";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";

vi.mock("../src/db/elastic", () => ({
  default: elasticMock,
}));

vi.mock("@sentry/node", () => ({
  default: sentryMock,
  ...sentryMock,
}));

// Mock services
vi.mock("../src/services/api-datasubvention", () => ({
  default: dataSubventionMock,
}));

let mongoServer: MongoMemoryServer;
type PostgresModule = typeof import("../src/db/postgres");
let prismaCore: PostgresModule["prismaCore"] | null = null;
let prismaAnalytics: PostgresModule["prismaAnalytics"] | null = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const postgresModule = await import("../src/db/postgres");
  prismaCore = postgresModule.prismaCore;
  prismaAnalytics = postgresModule.prismaAnalytics;

  try {
    await postgresModule.pgConnected;
  } catch (error) {
    console.error("[Tests] Failed to connect Prisma clients:", error);
    throw error;
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  if (prismaCore) {
    await prismaCore.$transaction([prismaCore.publisherDiffusion.deleteMany({}), prismaCore.publisher.deleteMany({})]);
  }
});

afterAll(async () => {
  if (prismaCore) {
    await prismaCore.$disconnect();
  }
  if (prismaAnalytics) {
    await prismaAnalytics.$disconnect();
  }

  await mongoose.disconnect();
  await mongoServer.stop();
});
