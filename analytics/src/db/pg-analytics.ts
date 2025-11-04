import { createPgPool, withPgClient } from "./pg-helper";

const connectionString = process.env.DATABASE_URL_ANALYTICS;
if (!connectionString) {
  throw new Error("DATABASE_URL_ANALYTICS must be defined");
}

const analyticsPool = createPgPool(connectionString);

export const getAnalyticsPool = () => analyticsPool;
export const withAnalyticsClient = withPgClient(analyticsPool);
