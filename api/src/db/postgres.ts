import { PrismaPg } from "@prisma/adapter-pg";

import type { Prisma } from "./core/client";
import { PrismaClient } from "./core/client";

// Pool size configuration for Core DB based on:
// - PostgreSQL max_connections = 200
// - API autoscaling in production up to 4 instances
// - Reserved DB connections for jobs/admin/maintenance
// See https://github.com/betagouv/api-engagement/pull/726 for dimensioning guidelines
const poolSizeCore = parseInt(process.env.PRISMA_POOL_SIZE_CORE || "20", 10);
const poolSizeCoreRead = parseInt(process.env.PRISMA_POOL_SIZE_CORE || "12", 10);
const poolTimeout = parseInt(process.env.PRISMA_POOL_TIMEOUT || "20", 10);
const connectTimeout = parseInt(process.env.PRISMA_CONNECT_TIMEOUT || "10", 10);
const prismaDebugSql = process.env.PRISMA_DEBUG_SQL === "true";
const writeConnectionString = process.env.DATABASE_URL_CORE;
const readConnectionString = process.env.DATABASE_URL_CORE_REPLICA || writeConnectionString;
const hasDedicatedReadReplica = !!process.env.DATABASE_URL_CORE_REPLICA && readConnectionString !== writeConnectionString;

type PrismaQueryEvent = {
  query: string;
  params: string;
  duration: number;
};

const prismaLogConfig: Array<Prisma.LogLevel | Prisma.LogDefinition> = prismaDebugSql
  ? [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
    ]
  : [{ emit: "stdout", level: "error" }];

const adapter = new PrismaPg({
  connectionString: writeConnectionString,
  max: poolSizeCore,
  idleTimeoutMillis: poolTimeout * 1000,
  connectionTimeoutMillis: connectTimeout * 1000,
});

const prisma = new PrismaClient({
  adapter,
  log: prismaLogConfig,
});

const prismaRead = hasDedicatedReadReplica
  ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString: readConnectionString,
        max: poolSizeCoreRead,
        idleTimeoutMillis: poolTimeout * 1000,
        connectionTimeoutMillis: connectTimeout * 1000,
      }),
      log: prismaLogConfig,
    })
  : prisma;

if (prismaDebugSql) {
  prisma.$on("query", (event: PrismaQueryEvent) => {
    console.log(`[Prisma:Core] ${event.duration}ms ${event.query} params=${event.params}`);
  });

  if (hasDedicatedReadReplica) {
    prismaRead.$on("query", (event: PrismaQueryEvent) => {
      console.log(`[Prisma:Replica] ${event.duration}ms ${event.query} params=${event.params}`);
    });
  }
}

const pgConnected = async () => {
  return prisma
    .$connect()
    .then(() => {
      console.log(`[PostgreSQL] Core connected (pool: ${poolSizeCore}, read pool: ${hasDedicatedReadReplica ? poolSizeCoreRead : poolSizeCore}, timeout: ${poolTimeout}s)`);
      if (hasDedicatedReadReplica) {
        return prismaRead.$connect();
      }
      return Promise.resolve();
    })
    .catch((error) => {
      console.error("[PostgreSQL] Core Connection error:", error);
      throw error;
    });
};

const pgDisconnect = async () => {
  await prisma.$disconnect();
  if (hasDedicatedReadReplica) {
    await prismaRead.$disconnect();
  }
};

export { pgConnected, pgDisconnect, prisma, prismaRead };
