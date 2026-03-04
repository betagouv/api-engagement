import "./shared";

import { afterEach, beforeEach, vi } from "vitest";

import { pgMock } from "../mocks";

vi.mock("@/db/postgres", () => ({
  prisma: pgMock,
  pgConnected: Promise.resolve(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});
