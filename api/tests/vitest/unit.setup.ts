import "./shared";

import { afterEach, beforeEach, vi } from "vitest";

import { createPrismaClientMock, pgMock } from "../mocks";

const prismaAnalytics = createPrismaClientMock();

vi.mock("../../src/db/postgres", () => ({
  prismaCore: pgMock,
  prismaAnalytics,
  pgConnected: Promise.resolve(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});
