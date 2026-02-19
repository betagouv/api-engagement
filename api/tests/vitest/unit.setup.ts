import "./shared";

import { afterEach, beforeEach, vi } from "vitest";

import { pgMock } from "../mocks";

vi.mock("../../src/db/postgres", () => ({
  prismaCore: pgMock,
  pgConnected: Promise.resolve(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});
