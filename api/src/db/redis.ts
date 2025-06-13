import { Redis } from "ioredis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from "../config";

if (!REDIS_HOST || !REDIS_PORT) {
  throw new Error("[Redis] REDIS_HOST and REDIS_PORT must be defined");
}

export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  username: REDIS_USERNAME || undefined,
};

// Create a promise that resolves when Redis is connected
export const redisConnected = new Promise<void>((resolve, reject) => {
  try {
    console.log(`[Redis] Attempting to connect to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    const redis = new Redis(redisConnection);

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err);
      reject(err);
    });

    redis.on("ready", async () => {
      try {
        await redis.ping();
        console.log("[Redis] Connection successful - Redis is ready");
        resolve();
      } catch (error) {
        console.error("[Redis] Ping failed:", error);
        reject(error);
      }
    });
  } catch (error) {
    console.error("[Redis] Connection setup failed:", error);
    reject(error);
  }
});
