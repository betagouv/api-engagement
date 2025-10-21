import { Pool, PoolClient } from "pg";

const analyticsPool = new Pool({
  connectionString: process.env.DATABASE_URL_ANALYTICS,
  max: 10,
});

analyticsPool.on("error", (error) => {
  console.error("[PostgreSQL] Analytics pool error", error);
});

export const getAnalyticsPool = () => analyticsPool;

export const withAnalyticsClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await analyticsPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

