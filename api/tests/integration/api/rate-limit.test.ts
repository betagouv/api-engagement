import { PostgresStore } from "@acpr/rate-limit-postgresql";
import express from "express";
import { Store } from "express-rate-limit";
import path from "node:path";
import { Client } from "pg";
import { migrate } from "postgres-migrations";
import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createIpRateLimiter, createPublisherRateLimiter } from "@/middlewares/rate-limit";
import { createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

const createRateLimitedApp = ({ publisherMax, ipMax, store }: { publisherMax?: number; ipMax?: number; store?: Store } = {}) => {
  const wrapper = express();
  wrapper.set("trust proxy", true);
  if (publisherMax !== undefined) {
    wrapper.use("/v0", createPublisherRateLimiter(publisherMax, store));
  }
  if (ipMax !== undefined) {
    wrapper.use(["/r", "/mission"], createIpRateLimiter(ipMax, store));
  }
  wrapper.use(createTestApp());
  return wrapper;
};

describe("Rate limiting", () => {
  describe("publisherRateLimiter — /v0/*", () => {
    let app: ReturnType<typeof createRateLimitedApp>;
    let apiKey: string;

    beforeEach(async () => {
      app = createRateLimitedApp({ publisherMax: 2 });
      const publisher = await createTestPublisher();
      apiKey = publisher.apikey;
    });

    it("returns 429 after exceeding the threshold", async () => {
      await request(app).get("/v0/mission").set("x-api-key", apiKey);
      await request(app).get("/v0/mission").set("x-api-key", apiKey);
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        ok: false,
        code: "TOO_MANY_REQUESTS",
        message: expect.any(String),
      });
    });

    it("exposes X-RateLimit-* headers", async () => {
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(res.headers["x-ratelimit-limit"]).toBeDefined();
      expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(res.headers["x-ratelimit-reset"]).toBeDefined();
    });

    it("does not return 429 below the threshold", async () => {
      await request(app).get("/v0/mission").set("x-api-key", apiKey);
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(res.status).not.toBe(429);
    });
  });

  describe("ipRateLimiter — /r/*", () => {
    let app: ReturnType<typeof createRateLimitedApp>;

    beforeEach(() => {
      app = createRateLimitedApp({ ipMax: 2 });
    });

    it("returns 429 after exceeding the threshold", async () => {
      await request(app).get("/r/test");
      await request(app).get("/r/test");
      const res = await request(app).get("/r/test");

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        ok: false,
        code: "TOO_MANY_REQUESTS",
        message: expect.any(String),
      });
    });
  });

  describe("ipRateLimiter — backoffice /mission", () => {
    let app: ReturnType<typeof createRateLimitedApp>;

    beforeEach(() => {
      app = createRateLimitedApp({ ipMax: 2 });
    });

    it("returns 429 after exceeding the threshold", async () => {
      await request(app).get("/mission");
      await request(app).get("/mission");
      const res = await request(app).get("/mission");

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        ok: false,
        code: "TOO_MANY_REQUESTS",
        message: expect.any(String),
      });
    });
  });

  describe("publisherRateLimiter — shared PG store (multi-instance)", () => {
    beforeAll(async () => {
      // require.resolve gives .../dist/index.cjs — migrations sit alongside it
      const migrationsPath = path.join(path.dirname(require.resolve("@acpr/rate-limit-postgresql")), "migrations");
      const client = new Client({ connectionString: process.env.DATABASE_URL_CORE! });
      await client.connect();
      try {
        await migrate({ client }, migrationsPath);
      } finally {
        await client.end();
      }
    });

    it("shares counter across two app instances", async () => {
      const prefix = `rl:pub:test:${Date.now()}:`;
      const store1 = new PostgresStore({ connectionString: process.env.DATABASE_URL_CORE! }, prefix);
      const store2 = new PostgresStore({ connectionString: process.env.DATABASE_URL_CORE! }, prefix);
      const publisher = await createTestPublisher();
      const app1 = createRateLimitedApp({ publisherMax: 2, store: store1 });
      const app2 = createRateLimitedApp({ publisherMax: 2, store: store2 });

      await request(app1).get("/v0/mission").set("x-api-key", publisher.apikey);
      await request(app2).get("/v0/mission").set("x-api-key", publisher.apikey);
      const res = await request(app1).get("/v0/mission").set("x-api-key", publisher.apikey);

      expect(res.status).toBe(429);
    });
  });

  describe("RATE_LIMIT_DISABLED flag", () => {
    let app: ReturnType<typeof createRateLimitedApp>;
    let apiKey: string;

    beforeEach(async () => {
      app = createRateLimitedApp({ publisherMax: 1 });
      const publisher = await createTestPublisher();
      apiKey = publisher.apikey;
    });

    afterEach(() => {
      delete process.env.RATE_LIMIT_DISABLED;
    });

    it("blocks requests when flag is not set", async () => {
      await request(app).get("/v0/mission").set("x-api-key", apiKey);
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(res.status).toBe(429);
    });

    it("bypasses rate limit when RATE_LIMIT_DISABLED=true", async () => {
      process.env.RATE_LIMIT_DISABLED = "true";

      await request(app).get("/v0/mission").set("x-api-key", apiKey);
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(res.status).not.toBe(429);
    });
  });
});
