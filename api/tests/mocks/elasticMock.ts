import { vi } from "vitest";

const elasticMock = {
  index: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue({ body: { _source: {}, _id: "1" } }),
  count: vi.fn().mockResolvedValue({ body: { count: 0 } }),
  msearch: vi.fn().mockResolvedValue({
    body: {
      responses: [],
    },
  }),
  search: vi.fn().mockResolvedValue({
    body: {
      hits: { total: { value: 0 } },
    },
  }),
  ping: vi.fn().mockResolvedValue({ statusCode: 200 }),
};

export default elasticMock;
