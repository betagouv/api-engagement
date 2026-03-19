import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { publisherDiffusionExclusionService } from "@/services/publisher-diffusion-exclusion";
import publisherOrganizationService from "@/services/publisher-organization";
import { MissionRecord, PublisherMissionType, PublisherRecord } from "@/types";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createStatEventFixture } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

describe("MyOrganization API Integration Tests", () => {
  const app = createTestApp();
  let publisher: PublisherRecord;
  let apiKey: string;
  let mission: MissionRecord;
  let publisher1: PublisherRecord;
  let publisher2: PublisherRecord;
  let publisher3: PublisherRecord;
  let orgId: string;
  let publisherOrganization: PublisherOrganizationRecord;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey || "";
    orgId = "test-org-id";
    mission = await createTestMission({ organizationClientId: orgId, publisherId: publisher.id });
    publisher1 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id, publisherName: publisher.name, moderator: true, missionType: PublisherMissionType.BENEVOLAT }],
    });
    publisher2 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id, publisherName: publisher.name, moderator: true, missionType: PublisherMissionType.BENEVOLAT }],
    });
    publisher3 = await createTestPublisher();
    publisherOrganization = await publisherOrganizationService.findUniqueOrCreate(orgId, publisher.id, { name: "Test Organization" });
  });

  /**
   * GET /v0/myorganization/:organizationClientId
   * - should return 401 if not authenticated
   * - should return 404 if no publisher organization exists
   * - should return list of publishers with correct format
   * - should return correct exclusion status for publishers
   */
  describe("GET /v0/myorganization/:organizationClientId", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/v0/myorganization/${orgId}`);
      expect(response.status).toBe(401);
    });

    it("should return 404 if no publisher organization exists", async () => {
      const response = await request(app).get(`/v0/myorganization/unknown-org-id`).set("x-api-key", apiKey).set("apikey", apiKey);
      expect(response.status).toBe(404);
    });

    it("should return list of publishers for the organization with correct format", async () => {
      await seedClicks({ fromPublisherId: publisher1.id, toPublisherId: publisher3.id, count: 2, organizationClientId: orgId, missionId: mission.id });
      await seedClicks({ fromPublisherId: publisher2.id, toPublisherId: publisher3.id, count: 1, organizationClientId: orgId, missionId: mission.id });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey).set("apikey", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      const partner1 = response.body.data.find((p: any) => p._id === publisher1.id);
      const partner2 = response.body.data.find((p: any) => p._id === publisher2.id);

      [partner1, partner2].forEach((partner) => {
        expect(partner).toHaveProperty("_id");
        expect(partner).toHaveProperty("name");
        expect(partner).toHaveProperty("category");
        expect(partner).toHaveProperty("url");
        expect(partner).toHaveProperty("logo");
        expect(partner).toHaveProperty("description");
        expect(partner).toHaveProperty("widget");
        expect(partner).toHaveProperty("api");
        expect(partner).toHaveProperty("campaign");
        expect(partner).toHaveProperty("annonceur");
        expect(partner).toHaveProperty("excluded");
        expect(partner).toHaveProperty("clicks");
        expect(typeof partner.excluded).toBe("boolean");
        expect(typeof partner.clicks).toBe("number");
      });

      expect(partner1.clicks).toBe(2);
      expect(partner2.clicks).toBe(1);
    });

    it("should return correct exclusion status for publishers", async () => {
      await publisherDiffusionExclusionService.createExclusion({
        excludedByAnnonceurId: publisher.id,
        excludedForDiffuseurId: publisher2.id,
        publisherOrganizationId: publisherOrganization.id,
      });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey).set("apikey", apiKey);

      expect(response.status).toBe(200);
      const partner1 = response.body.data.find((p: any) => p._id === publisher1.id);
      const partner2 = response.body.data.find((p: any) => p._id === publisher2.id);
      expect(partner1.excluded).toBe(false);
      expect(partner2.excluded).toBe(true);
    });
  });

  /**
   * PUT /v0/myorganization/:organizationClientId
   * - should return 401 if not authenticated
   * - should return 400 for invalid request body
   * - should update publisher exclusions based on publisherIds
   * - should remove exclusions when publisher is included
   * - should not overwrite exclusions of a different publisher
   * - should create publisher organization with the provided name when it does not exist
   */
  describe("PUT /v0/myorganization/:organizationClientId", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).put(`/v0/myorganization/${orgId}`).send({ publisherIds: [publisher1.id] });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid request body", async () => {
      const response = await request(app).put(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey).set("apikey", apiKey).send({ invalidField: "value" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });

    it("should update publisher exclusions based on publisherIds", async () => {
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .set("apikey", apiKey)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      const publisher1Data = response.body.data.find((p: any) => p._id === publisher1.id);
      const publisher2Data = response.body.data.find((p: any) => p._id === publisher2.id);
      expect(publisher1Data.excluded).toBe(false);
      expect(publisher2Data.excluded).toBe(true);

      // Verify via service: publisher1 has no exclusion, publisher2 does
      const exclusionsForP1 = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(publisher1.id);
      expect(exclusionsForP1.find((e) => e.publisherOrganizationId === publisherOrganization.id)).toBeUndefined();

      const exclusionsForP2 = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(publisher2.id);
      expect(exclusionsForP2.find((e) => e.publisherOrganizationId === publisherOrganization.id)).toBeDefined();
    });

    it("should remove exclusions when publisher is included", async () => {
      // Seed both partners as excluded
      await publisherDiffusionExclusionService.createExclusion({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher1.id, publisherOrganizationId: publisherOrganization.id });
      await publisherDiffusionExclusionService.createExclusion({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher2.id, publisherOrganizationId: publisherOrganization.id });

      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .set("apikey", apiKey)
        .send({ publisherIds: [publisher1.id, publisher2.id] });

      expect(response.status).toBe(200);

      const publisher1Data = response.body.data.find((p: any) => p._id === publisher1.id);
      const publisher2Data = response.body.data.find((p: any) => p._id === publisher2.id);
      expect(publisher1Data.excluded).toBe(false);
      expect(publisher2Data.excluded).toBe(false);

      const exclusionsForP1 = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(publisher1.id);
      expect(exclusionsForP1.find((e) => e.publisherOrganizationId === publisherOrganization.id)).toBeUndefined();

      const exclusionsForP2 = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(publisher2.id);
      expect(exclusionsForP2.find((e) => e.publisherOrganizationId === publisherOrganization.id)).toBeUndefined();
    });

    it("should not overwrite exclusions when receiving publisherId of a different publisher", async () => {
      const otherOrgClientId = "other-org-" + Date.now().toString();
      const otherPublisherOrg = await publisherOrganizationService.findUniqueOrCreate(otherOrgClientId, publisher3.id, { name: "Other Organization" });
      await publisherDiffusionExclusionService.createExclusion({
        excludedByAnnonceurId: publisher3.id,
        excludedForDiffuseurId: publisher1.id,
        publisherOrganizationId: otherPublisherOrg.id,
      });

      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .set("apikey", apiKey)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(200);

      const exclusionsForP1 = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(publisher1.id);
      // Exclusion from publisher3 for the other org still exists
      expect(exclusionsForP1.find((e) => e.publisherOrganizationId === otherPublisherOrg.id)).toBeDefined();
      // No exclusion from the current publisher for the test org
      expect(exclusionsForP1.find((e) => e.publisherOrganizationId === publisherOrganization.id)).toBeUndefined();
    });

    it("should create publisher organization with the provided name when it does not exist", async () => {
      const newOrgId = "brand-new-org-" + Date.now().toString();
      const newOrgName = "New Organization";

      const response = await request(app)
        .put(`/v0/myorganization/${newOrgId}`)
        .set("x-api-key", apiKey)
        .set("apikey", apiKey)
        .send({ publisherIds: [], organizationName: newOrgName });

      expect(response.status).toBe(200);

      // The org was created via findUniqueOrCreate with the provided name
      const createdOrg = await publisherOrganizationService.findUniqueOrCreate(newOrgId, publisher.id);
      expect(createdOrg.name).toBe(newOrgName);
    });
  });
});

async function seedClicks({
  fromPublisherId,
  toPublisherId,
  count,
  organizationClientId,
  missionId,
}: {
  fromPublisherId: string;
  toPublisherId: string;
  count: number;
  organizationClientId: string;
  missionId?: string;
}) {
  for (let i = 0; i < count; i += 1) {
    await createStatEventFixture({
      type: "click",
      isBot: false,
      fromPublisherId,
      toPublisherId,
      missionOrganizationClientId: organizationClientId,
      missionId,
    });
  }
}
