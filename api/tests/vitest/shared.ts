import { vi } from "vitest";

import { dataSubventionMock, elasticMock, sentryMock } from "../mocks";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";

vi.mock("../../src/db/elastic", () => ({
  default: elasticMock,
}));

vi.mock("@sentry/node", () => ({
  default: sentryMock,
  ...sentryMock,
}));

// Mock services that would otherwise call external APIs.
vi.mock("../../src/services/api-datasubvention", () => ({
  default: dataSubventionMock,
}));
