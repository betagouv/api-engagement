import { vi } from 'vitest';

// Mock bcrypt
export const mockBcrypt = {
  hash: vi.fn().mockImplementation((password, salt, callback) => {
    callback(null, `hashed_${password}`);
  }),
  compare: vi.fn().mockImplementation((password, hashedPassword) => {
    return Promise.resolve(hashedPassword === `hashed_${password}`);
  }),
};

// Setup mock module
vi.mock('bcryptjs', () => mockBcrypt);
