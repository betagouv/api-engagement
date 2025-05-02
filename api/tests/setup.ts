import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';

// Mock Elasticsearch client
vi.mock('../src/db/elastic', () => ({
  default: {
    search: vi.fn().mockResolvedValue({
      body: {
        aggregations: {
          fromPublisherId: {
            buckets: [],
          },
        },
      },
    }),
  },
}));

// Mock Sentry with all required methods
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Disconnect and stop MongoDB memory server
  await mongoose.disconnect();
  await mongoServer.stop();
});
