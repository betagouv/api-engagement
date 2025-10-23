import { Pool, PoolClient } from "pg";

export const createPgPool = (connectionString: string) => {
  const pool = new Pool({ connectionString, max: 10 });
  pool.on("error", (error) => {
    console.error("[PostgreSQL] Pool error", error);
  });
  return pool;
};

export const withPgClient =
  (pool: Pool) =>
  async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  };

