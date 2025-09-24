import { vi } from "vitest";

const pgMock = {
  statEvent: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
};

export default pgMock;
