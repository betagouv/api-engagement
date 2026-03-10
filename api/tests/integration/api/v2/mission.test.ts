import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { missionService } from "@/services/mission";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("Mission V2 Write API Integration Tests", () => {
  const app = createTestApp();
  let publisher: any;
  let apiKey: string;
  let otherPublisher: any;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey;
    otherPublisher = await createTestPublisher();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /v2/mission
  // ────────────────────────────────────────────────────────────────────────────

  describe("POST /v2/mission", () => {
    it("should return 401 without API key", async () => {
      const response = await request(app).post("/v2/mission").send({ clientId: "test-1", title: "Test Mission" });
      expect(response.status).toBe(401);
    });

    it("should return 400 if clientId is missing", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ title: "Test Mission" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 400 if title is missing", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-1" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 400 if type is invalid", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-1", title: "Test", type: "invalid_type" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 400 if organization field present without organizationName", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-1", title: "Test", organizationRNA: "W123456789" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 201 for minimal valid payload", async () => {
      const response = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({ clientId: "test-minimal", title: "Mission minimale", description: "Description valide", applicationUrl: "https://example.com/apply" });
      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.clientId).toBe("test-minimal");
      expect(response.body.data.title).toBe("Mission minimale");
      expect(response.body.data.publisherId).toBe(publisher.id);
      expect(response.body.data.statusCode).toBe("ACCEPTED");
    });

    it("should return 201 with all optional fields", async () => {
      const payload = {
        clientId: "test-full",
        title: "Mission complète",
        description: "Description",
        applicationUrl: "https://example.com/apply",
        type: "benevolat",
        remote: "possible",
        places: 5,
        compensationAmount: 100,
        compensationUnit: "day",
        compensationType: "gross",
        openToMinors: true,
        reducedMobilityAccessible: false,
        closeToTransport: true,
        startAt: "2026-06-01",
        endAt: "2026-12-31",
        tags: ["tag1", "tag2"],
        tasks: ["task1"],
        audience: ["18-25 ans"],
        softSkills: ["Communication"],
        addresses: [{ street: "1 rue Test", city: "Paris", postalCode: "75001" }],
      };

      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send(payload);
      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      const data = response.body.data;
      expect(data.type).toBe("benevolat");
      expect(data.places).toBe(5);
      expect(data.openToMinors).toBe(true);
      expect(data.reducedMobilityAccessible).toBe(false);
      expect(Array.isArray(data.addresses)).toBe(true);
    });

    it("should create PublisherOrganization and link mission when org fields present", async () => {
      const payload = {
        clientId: "test-org",
        title: "Mission avec org",
        organizationName: "Croix Rouge",
        organizationRNA: "W123456789",
        organizationUrl: "https://croix-rouge.fr",
      };

      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send(payload);
      expect(response.status).toBe(201);
      expect(response.body.data.organizationName).toBe("Croix Rouge");

      const org = await prisma.publisherOrganization.findFirst({ where: { publisherId: publisher.id, rna: "W123456789" } });
      expect(org).not.toBeNull();
      expect(org?.name).toBe("Croix Rouge");
    });

    it("should support organizationSiret when creating publisher organization", async () => {
      const payload = {
        clientId: "test-org-siret",
        title: "Mission avec SIRET",
        organizationName: "Asso Siret",
        organizationSiret: "12345678901234",
      };

      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send(payload);
      expect(response.status).toBe(201);

      const org = await prisma.publisherOrganization.findFirst({
        where: {
          publisherId: publisher.id,
          clientId: "12345678901234",
        },
      });
      expect(org).not.toBeNull();
      expect(org?.siret).toBe("12345678901234");
      expect(org?.siren).toBe("123456789");
    });

    it("should set statusCode REFUSED when description is missing", async () => {
      const response = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({ clientId: "test-refused-no-desc", title: "Mission sans description", applicationUrl: "https://example.com/apply" });
      expect(response.status).toBe(201);
      expect(response.body.data.statusCode).toBe("REFUSED");
      expect(response.body.data.statusComment).toBe("Description manquante");
    });

    it("should set statusCode REFUSED when applicationUrl is missing", async () => {
      const response = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({ clientId: "test-refused-no-url", title: "Mission sans URL", description: "Description valide" });
      expect(response.status).toBe(201);
      expect(response.body.data.statusCode).toBe("REFUSED");
      expect(response.body.data.statusComment).toBe("URL de candidature manquant");
    });

    it("should return 409 for duplicate clientId within same publisher", async () => {
      await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-dup", title: "First" });
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-dup", title: "Second" });
      expect(response.status).toBe(409);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("RESSOURCE_ALREADY_EXIST");
    });

    it("should return 409 when a soft-deleted mission already exists for the same clientId", async () => {
      await createTestMission({
        publisherId: publisher.id,
        clientId: "test-dup-soft-deleted",
        title: "Mission soft deleted",
        deleted: true,
      });

      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-dup-soft-deleted", title: "Second" });
      expect(response.status).toBe(409);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("RESSOURCE_ALREADY_EXIST");
    });

    it("should set placesStatus = GIVEN_BY_PARTNER when places is provided", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-places", title: "Mission", places: 10 });
      expect(response.status).toBe(201);
      const mission = await missionService.findMissionByClientAndPublisher("test-places", publisher.id);
      expect(mission?.placesStatus).toBe("GIVEN_BY_PARTNER");
    });

    it("should set placesStatus = ATTRIBUTED_BY_API when places is absent", async () => {
      const response = await request(app).post("/v2/mission").set("x-api-key", apiKey).send({ clientId: "test-no-places", title: "Mission" });
      expect(response.status).toBe(201);
      const mission = await missionService.findMissionByClientAndPublisher("test-no-places", publisher.id);
      expect(mission?.placesStatus).toBe("ATTRIBUTED_BY_API");
    });

    it("should store addresses with geolocStatus = SHOULD_ENRICH", async () => {
      const response = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({ clientId: "test-geo", title: "Mission", addresses: [{ city: "Paris", postalCode: "75001" }] });
      expect(response.status).toBe(201);
      const addresses = await prisma.missionAddress.findMany({
        where: { mission: { clientId: "test-geo", publisherId: publisher.id } },
      });
      expect(addresses.length).toBe(1);
      expect(addresses[0].geolocStatus).toBe("SHOULD_ENRICH");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PUT /v2/mission/:clientId
  // ────────────────────────────────────────────────────────────────────────────

  describe("PUT /v2/mission/:clientId", () => {
    it("should return 401 without API key", async () => {
      const response = await request(app).put("/v2/mission/some-id").send({ title: "Updated" });
      expect(response.status).toBe(401);
    });

    it("should return 400 if body is invalid (invalid enum)", async () => {
      const mission = await createTestMission({ publisherId: publisher.id });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ type: "invalid_enum" });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 404 for non-existent clientId", async () => {
      const response = await request(app).put("/v2/mission/non-existent").set("x-api-key", apiKey).send({ title: "Updated" });
      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for mission belonging to another publisher", async () => {
      const mission = await createTestMission({ publisherId: otherPublisher.id });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ title: "Updated" });
      expect(response.status).toBe(404);
    });

    it("should return 404 for soft-deleted mission", async () => {
      const mission = await createTestMission({ publisherId: publisher.id, deleted: true });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ title: "Updated" });
      expect(response.status).toBe(404);
    });

    it("should update only the provided fields (PATCH semantics)", async () => {
      const mission = await createTestMission({ publisherId: publisher.id, title: "Original Title", description: "Original Description" });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.title).toBe("Updated Title");
      expect(response.body.data.description).toBe("Original Description");
    });

    it("should update PublisherOrganization when org fields are in body", async () => {
      const mission = await createTestMission({ publisherId: publisher.id });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ organizationName: "Updated Org", organizationRNA: "W999999999" });

      expect(response.status).toBe(200);
      const org = await prisma.publisherOrganization.findFirst({ where: { publisherId: publisher.id, rna: "W999999999" } });
      expect(org).not.toBeNull();
      expect(org?.name).toBe("Updated Org");
    });

    it("should preserve existing org fields when doing partial update", async () => {
      const responseCreate = await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({
          clientId: "test-org-partial-update",
          title: "Mission org partielle",
          organizationClientId: "org-partial-update",
          organizationName: "Asso Initiale",
          organizationRNA: "W123456789",
          organizationBeneficiaries: ["Jeunes"],
        });
      expect(responseCreate.status).toBe(201);

      const responseUpdate = await request(app).put("/v2/mission/test-org-partial-update").set("x-api-key", apiKey).send({
        organizationClientId: "org-partial-update",
        organizationName: "Asso Renommee",
      });
      expect(responseUpdate.status).toBe(200);

      const org = await prisma.publisherOrganization.findFirst({
        where: {
          publisherId: publisher.id,
          clientId: "org-partial-update",
        },
      });

      expect(org).not.toBeNull();
      expect(org?.name).toBe("Asso Renommee");
      expect(org?.rna).toBe("W123456789");
      expect(org?.beneficiaries).toEqual(["Jeunes"]);
    });

    it("should keep statusCode ACCEPTED when partial update doesn't invalidate existing fields", async () => {
      const mission = await createTestMission({
        publisherId: publisher.id,
        title: "Mission valide",
        description: "Description existante",
        applicationUrl: "https://example.com/apply",
        domain: "sport", // valid domain to avoid moderation refusal
        statusCode: "ACCEPTED",
      });

      // Only update the title — description and applicationUrl still valid from existing record
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ title: "Titre mis à jour" });

      expect(response.status).toBe(200);
      expect(response.body.data.statusCode).toBe("ACCEPTED");
    });

    it("should set statusCode REFUSED when description is cleared on update", async () => {
      const mission = await createTestMission({
        publisherId: publisher.id,
        title: "Mission valide",
        description: "Description existante",
        applicationUrl: "https://example.com/apply",
        domain: "sport", // valid domain to avoid masking the expected refusal reason
        statusCode: "ACCEPTED",
      });

      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ description: "" });

      expect(response.status).toBe(200);
      expect(response.body.data.statusCode).toBe("REFUSED");
      expect(response.body.data.statusComment).toBe("Description manquante");
    });

    it("should not duplicate PublisherOrganization when org data is unchanged", async () => {
      const orgFields = { organizationName: "Asso Stable", organizationRNA: "W111111111" };

      // Create via POST
      await request(app)
        .post("/v2/mission")
        .set("x-api-key", apiKey)
        .send({ clientId: "test-org-no-dup", title: "Mission", ...orgFields });

      // Update with same org data → should not create a second org record
      await request(app).put("/v2/mission/test-org-no-dup").set("x-api-key", apiKey).send(orgFields);

      const orgs = await prisma.publisherOrganization.findMany({ where: { publisherId: publisher.id, rna: "W111111111" } });
      expect(orgs).toHaveLength(1);
    });

    it("should recalculate placesStatus when places is in body", async () => {
      const mission = await createTestMission({ publisherId: publisher.id, places: undefined, placesStatus: "ATTRIBUTED_BY_API" });
      const response = await request(app).put(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey).send({ places: 3 });

      expect(response.status).toBe(200);
      const updated = await missionService.findMissionByClientAndPublisher(mission.clientId, publisher.id);
      expect(updated?.placesStatus).toBe("GIVEN_BY_PARTNER");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE /v2/mission/:clientId
  // ────────────────────────────────────────────────────────────────────────────

  describe("DELETE /v2/mission/:clientId", () => {
    it("should return 401 without API key", async () => {
      const response = await request(app).delete("/v2/mission/some-id");
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent mission", async () => {
      const response = await request(app).delete("/v2/mission/non-existent").set("x-api-key", apiKey);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for mission belonging to another publisher", async () => {
      const mission = await createTestMission({ publisherId: otherPublisher.id });
      const response = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);
      expect(response.status).toBe(404);
    });

    it("should soft-delete a mission and return 200 with deletedAt", async () => {
      const mission = await createTestMission({ publisherId: publisher.id });
      const response = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.clientId).toBe(mission.clientId);
      expect(response.body.data.deletedAt).toBeDefined();

      const deleted = await missionService.findMissionByClientAndPublisher(mission.clientId, publisher.id);
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it("should be idempotent: second DELETE returns same deletedAt", async () => {
      const mission = await createTestMission({ publisherId: publisher.id });

      const first = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);
      expect(first.status).toBe(200);
      const firstDeletedAt = first.body.data.deletedAt;

      const second = await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);
      expect(second.status).toBe(200);
      expect(second.body.data.deletedAt).toBe(firstDeletedAt);
    });

    it("should not return soft-deleted mission via findMissionByClientAndPublisher", async () => {
      const mission = await createTestMission({ publisherId: publisher.id });
      await request(app).delete(`/v2/mission/${mission.clientId}`).set("x-api-key", apiKey);

      const found = await missionService.findMissionByClientAndPublisher(mission.clientId, publisher.id);
      expect(found?.deletedAt).not.toBeNull();
    });
  });
});
