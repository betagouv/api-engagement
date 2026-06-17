import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import publisherOrganizationService from "@/services/publisher-organization";
import { MissionRecord, PublisherMissionType, PublisherRecord } from "@/types";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestMission, createTestPublisher } from "../../../../fixtures";
import { createStatEventFixture } from "../../../../fixtures/stat-event";
import { createTestApp } from "../../../../testApp";

const RULE_FIELD = "publisherOrganization.clientId";

async function hasExclusionRule(diffuseurId: string, annonceurId: string, organizationClientId: string): Promise<boolean> {
  const rules = await publisherDiffusionRuleService.findRules({
    publisherId: diffuseurId,
    combinedWithId: null,
    field: "publisherId",
    value: annonceurId,
    includeCombinedRules: true,
  });
  return rules.some((root) => (root.combinedRules ?? []).some((child) => child.field === RULE_FIELD && child.value === organizationClientId));
}

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
      publishers: [{ publisherId: publisher.id }],
    });
    publisher2 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id }],
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
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: publisher2.id,
        annonceurPublisherId: publisher.id,
        field: RULE_FIELD,
        fieldType: "string",
        operator: "is_not",
        value: orgId,
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
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .send({ publisherIds: [publisher1.id] });
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

      expect(await hasExclusionRule(publisher1.id, publisher.id, orgId)).toBe(false);
      expect(await hasExclusionRule(publisher2.id, publisher.id, orgId)).toBe(true);
    });

    it("should remove exclusions when publisher is included", async () => {
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: publisher1.id,
        annonceurPublisherId: publisher.id,
        field: RULE_FIELD,
        fieldType: "string",
        operator: "is_not",
        value: orgId,
      });
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: publisher2.id,
        annonceurPublisherId: publisher.id,
        field: RULE_FIELD,
        fieldType: "string",
        operator: "is_not",
        value: orgId,
      });

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

      expect(await hasExclusionRule(publisher1.id, publisher.id, orgId)).toBe(false);
      expect(await hasExclusionRule(publisher2.id, publisher.id, orgId)).toBe(false);
    });

    it("should not overwrite exclusions when receiving publisherId of a different publisher", async () => {
      const otherOrgClientId = "other-org-" + Date.now().toString();
      await publisherOrganizationService.findUniqueOrCreate(otherOrgClientId, publisher3.id, { name: "Other Organization" });
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: publisher1.id,
        annonceurPublisherId: publisher3.id,
        field: RULE_FIELD,
        fieldType: "string",
        operator: "is_not",
        value: otherOrgClientId,
      });

      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .set("apikey", apiKey)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(200);

      // Exclusion from publisher3 for the other org still exists
      expect(await hasExclusionRule(publisher1.id, publisher3.id, otherOrgClientId)).toBe(true);
      // No exclusion from the current publisher for the test org
      expect(await hasExclusionRule(publisher1.id, publisher.id, orgId)).toBe(false);
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
