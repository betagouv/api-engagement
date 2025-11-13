import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prismaCore } from "../../../../src/db/postgres";
import OrganizationExclusionModel from "../../../../src/models/organization-exclusion";
import { Mission, MissionType, PublisherRecord } from "../../../../src/types";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createStatEventFixture } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

describe("MyOrganization API Integration Tests", () => {
  const app = createTestApp();
  let publisher: PublisherRecord;
  let apiKey: string;
  let mission: Mission;
  let publisher1: PublisherRecord;
  let publisher2: PublisherRecord;
  let orgId: string;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey || "";
    orgId = "test-org-id";
    mission = await createTestMission({ organizationClientId: orgId, publisherId: publisher.id });
    publisher1 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id, publisherName: publisher.name, moderator: true, missionType: MissionType.BENEVOLAT }],
    });
    publisher2 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id, publisherName: publisher.name, moderator: true, missionType: MissionType.BENEVOLAT }],
    });
    await createTestPublisher();
    await prismaCore.statEvent.deleteMany({});
  });

  afterEach(async () => {
    await prismaCore.statEvent.deleteMany({});
  });

  /**
   * GET /v0/myorganization/:organizationClientId
   * - should return 401 if not authenticated
   * - should return list of publishers for the organization with correct format
   */
  describe("GET /v0/myorganization/:organizationClientId", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/v0/myorganization/${orgId}`);
      expect(response.status).toBe(401);
    });

    it("should return list of publishers for the organization with correct format", async () => {
      await seedClicks({
        publisherId: publisher1.id,
        publisherName: publisher1.name,
        count: 2,
      });
      await seedClicks({
        publisherId: publisher2.id,
        publisherName: publisher2.name,
        count: 1,
      });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Should have our two test partners related to publisher

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
      await seedClicks({ publisherId: publisher1.id, publisherName: publisher1.name, count: 1 });
      await seedClicks({ publisherId: publisher2.id, publisherName: publisher2.name, count: 1 });

      // Add exclusion for publisher2
      await OrganizationExclusionModel.create({
        excludedByPublisherId: publisher.id,
        excludedByPublisherName: publisher.name,
        excludedForPublisherId: publisher2.id,
        excludedForPublisherName: publisher2.name,
        organizationClientId: orgId,
        organizationName: publisher.name,
      });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey);
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
   * - should update publisher exclusions based on publisherIds
   * - should remove exclusions when publisher is included
   * - should not overwrite exclusions when receiving publisherId of a different publisher
   */
  describe("PUT /v0/myorganization/:organizationClientId", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid request body", async () => {
      const response = await request(app).put(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey).send({ invalidField: "value" }); // Missing required publisherIds

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });

    it("should update publisher exclusions based on publisherIds", async () => {
      // Include only publisher1 (exclude publisher2)
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify publisher1 is not excluded
      const publisher1Data = response.body.data.find((p: any) => p._id.toString() === publisher1.id);
      expect(publisher1Data.excluded).toBe(false);

      // Verify publisher2 is excluded
      const publisher2Data = response.body.data.find((p: any) => p._id.toString() === publisher2.id);
      expect(publisher2Data.excluded).toBe(true);

      // Verify publisher1 exclusion does not exist
      const publisher1Exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher.id,
        excludedForPublisherId: publisher1.id,
        organizationClientId: orgId,
      });
      expect(publisher1Exclusion).toBeNull();

      // Verify publisher2 exclusion exists
      const publisher2Exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher.id,
        excludedForPublisherId: publisher2.id,
        organizationClientId: orgId,
      });
      expect(publisher2Exclusion).toBeDefined();
    });

    it("should remove exclusions when publisher is included", async () => {
      // First exclude both partners
      await OrganizationExclusionModel.create([
        {
          excludedByPublisherId: publisher.id,
          excludedByPublisherName: publisher.name,
          excludedForPublisherId: publisher1.id,
          excludedForPublisherName: publisher1.name,
          organizationClientId: orgId,
          organizationName: publisher.name,
        },
        {
          excludedByPublisherId: publisher.id,
          excludedByPublisherName: publisher.name,
          excludedForPublisherId: publisher2.id,
          excludedForPublisherName: publisher2.name,
          organizationClientId: orgId,
          organizationName: publisher.name,
        },
      ]);

      // Call endpoint to include both partners
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .send({ publisherIds: [publisher1.id, publisher2.id] });

      expect(response.status).toBe(200);

      // Verify both partners are not excluded in the response
      const publisher1Data = response.body.data.find((p: any) => p._id.toString() === publisher1.id);
      const publisher2Data = response.body.data.find((p: any) => p._id.toString() === publisher2.id);
      expect(publisher1Data.excluded).toBe(false);
      expect(publisher2Data.excluded).toBe(false);

      // Verify database was updated correctly
      const exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher.id,
        excludedForPublisherId: publisher1.id,
        organizationClientId: orgId,
      });
      expect(exclusion).toBeNull();
    });

    it("should not overwrite exclusions when receiving publisherId of a different publisher", async () => {
      // Exclude organization from different publisher
      const otherOrganizationClientId = "other-org-" + Date.now().toString();
      const otherPublisherId = "other-publisher-" + Date.now().toString();
      await OrganizationExclusionModel.create({
        excludedByPublisherId: otherPublisherId,
        excludedByPublisherName: publisher.name,
        excludedForPublisherId: publisher1.id,
        excludedForPublisherName: publisher1.name,
        organizationClientId: otherOrganizationClientId,
        organizationName: publisher.name,
      });

      // Include publisher1 in the test organization
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .send({ publisherIds: [publisher1.id] });

      expect(response.status).toBe(200);

      // Other organization exclusion should still exist
      const otherExclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: otherPublisherId,
        excludedForPublisherId: publisher1.id,
        organizationClientId: otherOrganizationClientId,
      });
      expect(otherExclusion).toBeDefined();

      // Test organization should not have exclusion
      const testExclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher.id,
        excludedForPublisherId: publisher1.id,
        organizationClientId: orgId,
      });
      expect(testExclusion).toBeNull();
    });
  });
});

async function seedClicks({ publisherId, publisherName, count }: { publisherId: string; publisherName: string; count: number }) {
  for (let i = 0; i < count; i += 1) {
    await createStatEventFixture({
      type: "click",
      isBot: false,
      fromPublisherId: publisherId,
      fromPublisherName: publisherName,
    });
  }
}
