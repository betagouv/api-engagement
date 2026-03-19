/**
 * OpenAPI spec compliance tests.
 *
 * Each test makes one real HTTP request against the API and asserts the response
 * conforms to docs/openapi.yaml. A 500 response means express-openapi-validator
 * rejected the response shape — either the spec is wrong or the API drifted.
 *
 * Coverage: all endpoints mounted in the test app (/v0/* and /v2/*).
 * Excluded: /v0/organization and /v0/publisher (not mounted in testOpenApiApp).
 */
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestMission, createTestPublisher } from "../../fixtures";
import { createStatEventFixture } from "../../fixtures/stat-event";
import { app } from "./testOpenApiApp";

describe("OpenAPI spec compliance", () => {
  let apiKey: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher();
    apiKey = publisher.apikey!;
    publisherId = publisher.id;
  });

  // ── Missions (v0 — lecture) ──────────────────────────────────────────────

  describe("GET /v0/mission", () => {
    it("response matches spec", async () => {
      await createTestMission({ publisherId });
      const res = await request(app).get("/v0/mission").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("GET /v0/mission/search", () => {
    it("response matches spec", async () => {
      const res = await request(app).get("/v0/mission/search").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("GET /v0/mission/:id", () => {
    it("response matches spec (found)", async () => {
      const mission = await createTestMission({ publisherId });
      const res = await request(app).get(`/v0/mission/${mission.id}`).set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (not found)", async () => {
      const res = await request(app).get("/v0/mission/nonexistent-id").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  // ── Mes missions (v0 — lecture annonceur) ───────────────────────────────

  describe("GET /v0/mymission", () => {
    it("response matches spec", async () => {
      await createTestMission({ publisherId });
      const res = await request(app).get("/v0/mymission").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("GET /v0/mymission/:clientId", () => {
    it("response matches spec (found)", async () => {
      const mission = await createTestMission({ publisherId });
      const res = await request(app).get(`/v0/mymission/${mission.clientId}`).set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (not found)", async () => {
      const res = await request(app).get("/v0/mymission/nonexistent-client-id").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("GET /v0/mymission/:clientId/stats", () => {
    it("response matches spec", async () => {
      const mission = await createTestMission({ publisherId });
      const res = await request(app).get(`/v0/mymission/${mission.clientId}/stats`).set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  // ── Missions (v2 — écriture) ─────────────────────────────────────────────

  describe("POST /v2/mission", () => {
    it("response matches spec (created)", async () => {
      const res = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({
          clientId: `spec-test-${Date.now()}`,
          title: "Mission de test spec",
          addresses: [{ city: "Paris", postalCode: "75001", country: "France" }],
        });
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (validation error)", async () => {
      const res = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({});
      expect(res.status).not.toBe(500);
    });
  });

  describe("PUT /v2/mission/:clientId", () => {
    it("response matches spec (updated)", async () => {
      const mission = await createTestMission({ publisherId });
      const res = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ title: "Titre mis à jour" });
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (not found)", async () => {
      const res = await request(app).put("/v2/mission/nonexistent-client-id").set("x-api-key", apiKey).send({ title: "X" });
      expect(res.status).not.toBe(500);
    });
  });

  describe("DELETE /v2/mission/:clientId", () => {
    it("response matches spec (deleted)", async () => {
      const mission = await createTestMission({ publisherId });
      const res = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (not found)", async () => {
      const res = await request(app).delete("/v2/mission/nonexistent-client-id").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  // ── Activités (v2) ───────────────────────────────────────────────────────

  describe("POST /v2/activity", () => {
    it("response matches spec", async () => {
      const click = await createStatEventFixture({ type: "click", toPublisherId: publisherId });
      const res = await request(app).post("/v2/activity").set("x-api-key", apiKey).send({ type: "apply", clickId: click._id });
      expect(res.status).not.toBe(500);
    });
  });

  describe("GET /v2/activity/:id", () => {
    it("response matches spec (found)", async () => {
      const stat = await createStatEventFixture({ type: "apply", toPublisherId: publisherId });
      const res = await request(app).get(`/v2/activity/${stat._id}`).set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });

    it("response matches spec (not found)", async () => {
      const res = await request(app).get("/v2/activity/nonexistent-id").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("PUT /v2/activity/:id", () => {
    it("response matches spec", async () => {
      const stat = await createStatEventFixture({ type: "apply", toPublisherId: publisherId });
      const res = await request(app).put(`/v2/activity/${stat._id}`).set("x-api-key", apiKey).send({ status: "VALIDATED" });
      expect(res.status).not.toBe(500);
    });
  });

  // ── Mon organisation (v0) ────────────────────────────────────────────────

  describe("GET /v0/myorganization/:organizationClientId", () => {
    it("response matches spec (not found)", async () => {
      const res = await request(app).get("/v0/myorganization/nonexistent-org").set("x-api-key", apiKey);
      expect(res.status).not.toBe(500);
    });
  });

  describe("PUT /v0/myorganization/:organizationClientId", () => {
    it("response matches spec (not found)", async () => {
      const res = await request(app).put("/v0/myorganization/nonexistent-org").set("x-api-key", apiKey).send({ name: "Mon org" });
      expect(res.status).not.toBe(500);
    });
  });
});
