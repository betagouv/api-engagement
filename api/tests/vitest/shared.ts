import { vi } from "vitest";

import { dataSubventionMock, s3Mock, sentryMock } from "../mocks";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";
// MFA désactivée par défaut dans la suite : le login classique reste testable.
// Les tests MFA (mfa.test.ts) la réactivent explicitement via vi.mock("@/config").
process.env.MFA_ENABLED = "false";

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
