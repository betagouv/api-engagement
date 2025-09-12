import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { dataSubventionMock, elasticMock, pgMock, sentryMock } from "./mocks";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";

vi.mock("../src/db/elastic", () => ({
  default: elasticMock,
}));

vi.mock("../src/db/postgres", () => ({
  prismaCore: pgMock,
  prismaAnalytics: pgMock,
  pgConnected: Promise.resolve(),
}));

vi.mock("../src/db/analytics", () => ({
  MissionHistoryEventType: {
    Created: "Created",
    Deleted: "Deleted",
    UpdatedStartDate: "UpdatedStartDate",
    UpdatedEndDate: "UpdatedEndDate",
    UpdatedDescription: "UpdatedDescription",
    UpdatedActivityDomain: "UpdatedActivityDomain",
    UpdatedPlaces: "UpdatedPlaces",
    UpdatedJVAModerationStatus: "UpdatedJVAModerationStatus",
    UpdatedApiEngModerationStatus: "UpdatedApiEngModerationStatus",
    UpdatedOther: "UpdatedOther",
  },
  MissionType: {
    benevolat: "benevolat",
    volontariat_service_civique: "volontariat_service_civique",
  },
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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
