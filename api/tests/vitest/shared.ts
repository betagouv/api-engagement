import { vi } from "vitest";

import { dataSubventionMock, s3Mock, sentryMock } from "../mocks";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";

vi.mock("@sentry/node", () => ({
  default: sentryMock,
  ...sentryMock,
}));

// Mock services that would otherwise call external APIs.
vi.mock("@/services/api-datasubvention", () => ({
  default: dataSubventionMock,
}));

vi.mock("@/services/s3", () => ({
  ...s3Mock,
}));

vi.mock("@/services/async-task", () => ({
  asyncTaskBus: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}));
