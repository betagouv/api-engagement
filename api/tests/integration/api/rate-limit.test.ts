import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createIpRateLimiter, createPublisherRateLimiter } from "@/middlewares/rate-limit";
import { createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

const createRateLimitedApp = ({ publisherMax, ipMax }: { publisherMax?: number; ipMax?: number } = {}) => {
  const wrapper = express();
  wrapper.set("trust proxy", true);
  if (publisherMax !== undefined) {
    wrapper.use("/v0", createPublisherRateLimiter(publisherMax));
  }
  if (ipMax !== undefined) {
    wrapper.use(["/r", "/mission"], createIpRateLimiter(ipMax));
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
});
