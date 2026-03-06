import { PrismaPg } from "@prisma/adapter-pg";

import type { Prisma } from "./core/client";
import { PrismaClient } from "./core/client";

// Pool size configuration for Core DB based on:
// - PostgreSQL max_connections = 350 (verified in production)
// - Number of API instances (max_scale = 1 in Terraform)
// - Number of concurrent jobs
// See https://github.com/betagouv/api-engagement/pull/726 for dimensioning guidelines
const poolSizeCore = parseInt(process.env.PRISMA_POOL_SIZE_CORE || "50", 10);
const poolTimeout = parseInt(process.env.PRISMA_POOL_TIMEOUT || "20", 10);
const connectTimeout = parseInt(process.env.PRISMA_CONNECT_TIMEOUT || "10", 10);
const prismaDebugSql = process.env.PRISMA_DEBUG_SQL === "true";

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
  connectionString: process.env.DATABASE_URL_CORE,
  max: poolSizeCore,
  idleTimeoutMillis: poolTimeout * 1000,
  connectionTimeoutMillis: connectTimeout * 1000,
});

const prisma = new PrismaClient({
  adapter,
  log: prismaLogConfig,
});

if (prismaDebugSql) {
  prisma.$on("query", (event: PrismaQueryEvent) => {
    console.log(`[Prisma:Core] ${event.duration}ms ${event.query} params=${event.params}`);
  });
}

const pgConnected = async () => {
  return prisma
    .$connect()
    .then(() => {
      console.log(`[PostgreSQL] Core connected (pool: ${poolSizeCore} connections, timeout: ${poolTimeout}s)`);
    })
    .catch((error) => {
      console.error("[PostgreSQL] Core Connection error:", error);
      throw error;
    });
};

const pgDisconnect = async () => {
  await prisma.$disconnect();
};

export { pgConnected, pgDisconnect, prisma };
