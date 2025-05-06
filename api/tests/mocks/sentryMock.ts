import { vi } from "vitest";

const sentryMock = {
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
};

export default sentryMock;
