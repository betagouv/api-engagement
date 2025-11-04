import { createPgPool, withPgClient } from "./pg-helper";

const connectionString = process.env.DATABASE_URL_CORE;
if (!connectionString) {
  throw new Error("DATABASE_URL_CORE must be defined");
}

const corePool = createPgPool(connectionString);

export const getCorePool = () => corePool;
export const withCoreClient = withPgClient(corePool);
