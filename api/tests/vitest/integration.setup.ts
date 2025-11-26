import "./shared";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";

let mongoServer: MongoMemoryServer;
type PostgresModule = typeof import("../../src/db/postgres");
let prismaCore: PostgresModule["prismaCore"] | null = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const postgresModule = await import("../../src/db/postgres");
  prismaCore = postgresModule.prismaCore;

  try {
    await postgresModule.pgConnected;
  } catch (error) {
    console.error("[Tests] Failed to connect Prisma clients:", error);
    throw error;
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  if (prismaCore) {
    // Clean dependent tables before parents to satisfy foreign keys (StatEvent -> PublisherDiffusion)
    await prismaCore.$transaction([prismaCore.statEvent.deleteMany({}), prismaCore.publisherDiffusion.deleteMany({}), prismaCore.publisher.deleteMany({})]);
  }
});

afterAll(async () => {
  // Do NOT call prisma.$disconnect() here - it causes NAPI reference counting errors
  // when running tests with Vitest threads. The PostgreSQL container stop in global
  // teardown will properly close all database connections.

  await mongoose.disconnect();
  await mongoServer.stop();
});
