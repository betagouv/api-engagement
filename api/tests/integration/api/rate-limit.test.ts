import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

describe("Rate limiting", () => {
  describe("publisherRateLimiter — /v0/*", () => {
    let app: ReturnType<typeof createTestApp>;
    let apiKey: string;

    beforeEach(async () => {
      app = createTestApp({ rateLimits: { publisherMax: 2 } });
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

      expect(res.headers["x-ratelimit-limit"]).toBe("2");
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
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
      app = createTestApp({ rateLimits: { ipMax: 2 } });
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
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
      app = createTestApp({ rateLimits: { ipMax: 2 } });
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
