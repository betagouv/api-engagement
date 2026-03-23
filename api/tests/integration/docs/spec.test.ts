/**
 * OpenAPI spec compliance tests.
 *
 * Each test makes one real HTTP request against the API and asserts:
 *   1. The response status matches the expected HTTP code for the scenario
 *   2. The response body conforms to the schema declared in docs/openapi.yaml
 *
 * A 500 response means express-openapi-validator rejected the response shape —
 * either the spec is wrong or the API drifted.
 * A wrong status code means the API behaviour changed without the spec being updated.
 */
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestMission, createTestPublisher } from "../../fixtures";
import { createStatEventFixture } from "../../fixtures/stat-event";
import { app } from "./testOpenApiApp";

describe("OpenAPI spec compliance", () => {
  // annonceur: crée des missions
  // diffuseur: diffuse les missions de l'annonceur (a l'annonceur dans sa liste de partenaires)
  let annonceurApiKey: string;
  let annonceurId: string;
  let diffuseurApiKey: string;

  beforeEach(async () => {
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    annonceurApiKey = annonceur.apikey!;
    annonceurId = annonceur.id;

    const diffuseur = await createTestPublisher({
      name: "Diffuseur",
      publishers: [{ publisherId: annonceur.id, publisherName: annonceur.name, moderator: false }],
    });
    diffuseurApiKey = diffuseur.apikey!;
  });

  // ── Missions (v0 — lecture diffuseur) ───────────────────────────────────

  describe("GET /v0/mission", () => {
    it("returns 200 with mission list", async () => {
      await createTestMission({ publisherId: annonceurId });
      const res = await request(app).get("/v0/mission").set("x-api-key", diffuseurApiKey);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /v0/mission/search", () => {
    it("returns 200 with search results", async () => {
      const res = await request(app).get("/v0/mission/search").set("x-api-key", diffuseurApiKey);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /v0/mission/:id", () => {
    it("returns 200 when mission exists", async () => {
      const mission = await createTestMission({ publisherId: annonceurId });
      const res = await request(app).get(`/v0/mission/${mission.id}`).set("x-api-key", diffuseurApiKey);
      expect(res.status).toBe(200);
    });

    it("returns 404 when mission does not exist", async () => {
      const res = await request(app).get("/v0/mission/nonexistent-id").set("x-api-key", diffuseurApiKey);
      expect(res.status).toBe(404);
    });
  });

  // ── Mes missions (v0 — lecture annonceur) ───────────────────────────────

  describe("GET /v0/mymission", () => {
    it("returns 200 with mission list", async () => {
      await createTestMission({ publisherId: annonceurId });
      const res = await request(app).get("/v0/mymission").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /v0/mymission/:clientId", () => {
    it("returns 200 when mission exists", async () => {
      const mission = await createTestMission({ publisherId: annonceurId });
      const res = await request(app).get(`/v0/mymission/${mission.clientId}`).set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });

    it("returns 404 when mission does not exist", async () => {
      const res = await request(app).get("/v0/mymission/nonexistent-client-id").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /v0/mymission/:clientId/stats", () => {
    it("returns 200 when mission exists", async () => {
      const mission = await createTestMission({ publisherId: annonceurId });
      const res = await request(app).get(`/v0/mymission/${mission.clientId}/stats`).set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });

    it("returns 404 when mission does not exist", async () => {
      const res = await request(app).get("/v0/mymission/nonexistent-client-id/stats").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  // ── Missions (v2 — écriture annonceur) ──────────────────────────────────

  describe("POST /v2/mission", () => {
    it("returns 201 when mission is created", async () => {
      const res = await request(app)
        .post("/v2/mission")
        .set("x-api-key", annonceurApiKey)
        .send({
          clientId: `spec-test-${Date.now()}`,
          title: "Mission de test spec",
          addresses: [{ city: "Paris", postalCode: "75001", country: "France" }],
        });
      expect(res.status).toBe(201);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/v2/mission").set("x-api-key", annonceurApiKey).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /v2/mission/:clientId", () => {
    it("returns 200 when mission is updated", async () => {
      const mission = await createTestMission({ publisherId: annonceurId });
      const res = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", annonceurApiKey).send({ title: "Titre mis à jour" });
      expect(res.status).toBe(200);
    });

    it("returns 404 when mission does not exist", async () => {
      const res = await request(app).put("/v2/mission/nonexistent-client-id").set("x-api-key", annonceurApiKey).send({ title: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /v2/mission/:clientId", () => {
    it("returns 200 when mission is deleted", async () => {
      const mission = await createTestMission({ publisherId: annonceurId });
      const res = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });

    it("returns 404 when mission does not exist", async () => {
      const res = await request(app).delete("/v2/mission/nonexistent-client-id").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  // ── Activités (v2) ───────────────────────────────────────────────────────

  describe("GET /v2/activity/:id", () => {
    it("returns 200 when activity exists", async () => {
      const stat = await createStatEventFixture({ type: "apply", toPublisherId: annonceurId });
      const res = await request(app).get(`/v2/activity/${stat._id}`).set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });

    it("returns 404 when activity does not exist", async () => {
      const res = await request(app).get("/v2/activity/nonexistent-id").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /v2/activity", () => {
    it("returns 200 when activity is created", async () => {
      const click = await createStatEventFixture({ type: "click", toPublisherId: annonceurId });
      const res = await request(app).post("/v2/activity").set("x-api-key", annonceurApiKey).send({ type: "apply", clickId: click._id });
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /v2/activity/:id", () => {
    it("returns 200 when activity is updated", async () => {
      const stat = await createStatEventFixture({ type: "apply", toPublisherId: annonceurId });
      const res = await request(app).put(`/v2/activity/${stat._id}`).set("x-api-key", annonceurApiKey).send({ status: "VALIDATED" });
      expect(res.status).toBe(200);
    });
  });

  // ── Organisations (v0) ───────────────────────────────────────────────────

  describe("GET /v0/organization", () => {
    it("returns 200 with organization list", async () => {
      const res = await request(app).get("/v0/organization").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });
  });

  // ── Partenaires diffuseurs (v0) ──────────────────────────────────────────

  describe("GET /v0/publisher", () => {
    it("returns 200 with publisher list", async () => {
      const res = await request(app).get("/v0/publisher").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /v0/publisher/:id", () => {
    it("returns 404 when publisher is not a diffuser partner", async () => {
      const res = await request(app).get("/v0/publisher/nonexistent-id").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  // ── Mes organisations (v0) ───────────────────────────────────────────────

  describe("GET /v0/myorganization/:organizationClientId", () => {
    it("returns 404 when organization does not exist", async () => {
      const res = await request(app).get("/v0/myorganization/nonexistent-org").set("x-api-key", annonceurApiKey);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /v0/myorganization/:organizationClientId", () => {
    it("returns 200 when organization diffusion settings are updated", async () => {
      const res = await request(app).put("/v0/myorganization/nonexistent-org").set("x-api-key", annonceurApiKey).send({ publisherIds: [] });
      expect(res.status).toBe(200);
    });
  });
});
