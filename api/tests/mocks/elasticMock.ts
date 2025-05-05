import { vi } from 'vitest';

const elasticMock = {
  msearch: vi.fn().mockResolvedValue({
    body: {
      responses: []
    }
  }),
  search: vi.fn().mockResolvedValue({
    body: {
      aggregations: {}
    }
  }),
  ping: vi.fn().mockResolvedValue({ statusCode: 200 }),
};

export default elasticMock;
