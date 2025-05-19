import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from "../config";

if (!REDIS_HOST || !REDIS_PORT) {
  throw new Error("REDIS_HOST and REDIS_PORT must be defined");
}

export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  username: REDIS_USERNAME || undefined,
};
