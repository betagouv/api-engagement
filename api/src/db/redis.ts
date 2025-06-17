import { Redis, RedisOptions } from "ioredis";
import { REDIS_CA_CERT_BASE64, REDIS_URL } from "../config";

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  keepAlive: 30000,
};

if (REDIS_URL.startsWith("rediss://")) {
  console.log("[Redis] TLS connection (rediss://) detected.");
  if (REDIS_CA_CERT_BASE64) {
    try {
      console.log("[Redis] Loading CA certificate from REDIS_CA_CERT_BASE64 environment variable.");
      const caCert = Buffer.from(REDIS_CA_CERT_BASE64, "base64");
      redisOptions.tls = {
        ca: caCert,
      };
    } catch (error: any) {
      console.error("[Redis] Aborting application start due to invalid Redis CA certificate configuration.");
      process.exit(1);
    }
  } else {
    console.warn(
      "[Redis] WARN: Connecting via rediss:// but REDIS_CA_CERT_BASE64 is not set. Using default CAs. This may fail if the server (e.g., Scaleway) requires a specific CA certificate."
    );
  }
}

export const redis = new Redis(REDIS_URL, redisOptions);

export const redisConnected = new Promise<void>((resolve, reject) => {
  redis.on("error", (error) => {
    console.error("[Redis] Connection error:", error);
    reject(error);
  });
  redis.on("ready", () => {
    console.log("[Redis] Connection ready.");
    resolve();
  });
});
