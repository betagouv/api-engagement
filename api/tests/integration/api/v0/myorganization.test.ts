import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { organizationExclusionService } from "../../../../src/services/organization-exclusion";
import { Mission, MissionType, PublisherRecord } from "../../../../src/types";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import elasticMock from "../../../mocks/elasticMock";
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
    process.env.READ_STATS_FROM = "es";

    elasticMock.search.mockReset();
    elasticMock.msearch.mockReset();

    elasticMock.search.mockResolvedValue({
      body: {
        hits: { total: { value: 0 } },
        aggregations: {
          fromPublisherId: {
            buckets: [],
          },
        },
      },
    });

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
    });

    it("should return correct exclusion status for publishers", async () => {
      // Mock ES: all clicks to 0
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            fromPublisherId: {
              buckets: [
                { key: publisher1.id, doc_count: 0 },
                { key: publisher2.id, doc_count: 0 },
              ],
            },
          },
        },
      });

      // Add exclusion for publisher2
      await organizationExclusionService.createExclusion({
        excludedByAnnonceurId: publisher.id,
        excludedForDiffuseurId: publisher2.id,
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
      const publisher1Exclusions = await organizationExclusionService.findExclusions({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher1.id });
      const publisher1Exclusion = publisher1Exclusions.find((e) => e.organizationClientId === orgId);
      expect(publisher1Exclusion).toBeUndefined();

      // Verify publisher2 exclusion exists
      const publisher2Exclusions = await organizationExclusionService.findExclusions({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher2.id });
      const publisher2Exclusion = publisher2Exclusions.find((e) => e.organizationClientId === orgId);
      expect(publisher2Exclusion).toBeDefined();
    });

    it("should remove exclusions when publisher is included", async () => {
      // First exclude both partners
      await organizationExclusionService.createManyExclusions([
        {
          excludedByAnnonceurId: publisher.id,
          excludedForDiffuseurId: publisher1.id,
          organizationClientId: orgId,
          organizationName: publisher.name,
        },
        {
          excludedByAnnonceurId: publisher.id,
          excludedForDiffuseurId: publisher2.id,
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
      const exclusions = await organizationExclusionService.findExclusions({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher1.id });
      const exclusion = exclusions.find((e) => e.organizationClientId === orgId);
      expect(exclusion).toBeUndefined();
    });

    it("should not overwrite exclusions when receiving publisherId of a different publisher", async () => {
      // Exclude organization from different publisher
      const otherOrganizationClientId = "other-org-" + Date.now().toString();
      const otherPublisherId = "other-publisher-" + Date.now().toString();
      await organizationExclusionService.createExclusion({
        excludedByAnnonceurId: otherPublisherId,
        excludedForDiffuseurId: publisher1.id,
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
      const otherExclusions = await organizationExclusionService.findExclusions({ excludedByAnnonceurId: otherPublisherId, excludedForDiffuseurId: publisher1.id });
      const otherExclusion = otherExclusions.find((e) => e.organizationClientId === otherOrganizationClientId);
      expect(otherExclusion).toBeDefined();

      // Test organization should not have exclusion
      const testExclusions = await organizationExclusionService.findExclusions({ excludedByAnnonceurId: publisher.id, excludedForDiffuseurId: publisher1.id });
      const testExclusion = testExclusions.find((e) => e.organizationClientId === orgId);
      expect(testExclusion).toBeUndefined();
    });
  });
});
