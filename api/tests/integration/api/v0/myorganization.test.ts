import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationExclusionModel from "../../../../src/models/organization-exclusion";
import { Mission, MissionType, Publisher } from "../../../../src/types";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import elasticMock from "../../../mocks/elasticMock";
import { createTestApp } from "../../../testApp";

vi.mock("../../../src/es", () => ({ esClient: elasticMock }));

describe("MyOrganization API Integration Tests", () => {
  const app = createTestApp();
  let publisher: Publisher;
  let apiKey: string;
  let mission: Mission;
  let publisher1: Publisher;
  let publisher2: Publisher;
  let orgId: string;

  beforeEach(async () => {
    elasticMock.search.mockReset();
    elasticMock.msearch.mockReset();

    publisher = await createTestPublisher();
    apiKey = publisher.apikey || "";
    orgId = "test-org-id";
    mission = await createTestMission({ organizationClientId: orgId, publisherId: publisher._id.toString() });
    publisher1 = await createTestPublisher({
      publishers: [{ publisherId: publisher._id.toString(), publisherName: publisher.name, moderator: true, missionType: MissionType.BENEVOLAT }],
    });
    publisher2 = await createTestPublisher({
      publishers: [{ publisherId: publisher._id.toString(), publisherName: publisher.name, moderator: true, missionType: MissionType.BENEVOLAT }],
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
      // Mock ES result with random clicks values
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            fromPublisherId: {
              buckets: [
                { key: publisher1._id.toString(), doc_count: 7 },
                { key: publisher2._id.toString(), doc_count: 0 },
              ],
            },
          },
        },
      });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Should have our two test partners related to publisher

      const partner1 = response.body.data.find((p: any) => p._id === publisher1._id.toString());
      const partner2 = response.body.data.find((p: any) => p._id === publisher2._id.toString());
      expect(partner1.clicks).toBe(7);
      expect(partner2.clicks).toBe(0);

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
                { key: publisher1._id.toString(), doc_count: 0 },
                { key: publisher2._id.toString(), doc_count: 0 },
              ],
            },
          },
        },
      });

      // Add exclusion for publisher2
      await OrganizationExclusionModel.create({
        excludedByPublisherId: publisher._id.toString(),
        excludedByPublisherName: publisher.name,
        excludedForPublisherId: publisher2._id.toString(),
        excludedForPublisherName: publisher2.name,
        organizationClientId: orgId,
        organizationName: publisher.name,
      });

      const response = await request(app).get(`/v0/myorganization/${orgId}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      const partner1 = response.body.data.find((p: any) => p._id === publisher1._id.toString());
      const partner2 = response.body.data.find((p: any) => p._id === publisher2._id.toString());
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
        .send({ publisherIds: [publisher1._id.toString()] });

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
        .send({ publisherIds: [publisher1._id.toString()] });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify publisher1 is not excluded
      const publisher1Data = response.body.data.find((p: any) => p._id.toString() === publisher1._id.toString());
      expect(publisher1Data.excluded).toBe(false);

      // Verify publisher2 is excluded
      const publisher2Data = response.body.data.find((p: any) => p._id.toString() === publisher2._id.toString());
      expect(publisher2Data.excluded).toBe(true);

      // Verify publisher1 exclusion does not exist
      const publisher1Exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher._id.toString(),
        excludedForPublisherId: publisher1._id.toString(),
        organizationClientId: orgId,
      });
      expect(publisher1Exclusion).toBeNull();

      // Verify publisher2 exclusion exists
      const publisher2Exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher._id.toString(),
        excludedForPublisherId: publisher2._id.toString(),
        organizationClientId: orgId,
      });
      expect(publisher2Exclusion).toBeDefined();
    });

    it("should remove exclusions when publisher is included", async () => {
      // First exclude both partners
      await OrganizationExclusionModel.create([
        {
          excludedByPublisherId: publisher._id.toString(),
          excludedByPublisherName: publisher.name,
          excludedForPublisherId: publisher1._id.toString(),
          excludedForPublisherName: publisher1.name,
          organizationClientId: orgId,
          organizationName: publisher.name,
        },
        {
          excludedByPublisherId: publisher._id.toString(),
          excludedByPublisherName: publisher.name,
          excludedForPublisherId: publisher2._id.toString(),
          excludedForPublisherName: publisher2.name,
          organizationClientId: orgId,
          organizationName: publisher.name,
        },
      ]);

      // Call endpoint to include both partners
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .send({ publisherIds: [publisher1._id.toString(), publisher2._id.toString()] });

      expect(response.status).toBe(200);

      // Verify both partners are not excluded in the response
      const publisher1Data = response.body.data.find((p: any) => p._id.toString() === publisher1._id.toString());
      const publisher2Data = response.body.data.find((p: any) => p._id.toString() === publisher2._id.toString());
      expect(publisher1Data.excluded).toBe(false);
      expect(publisher2Data.excluded).toBe(false);

      // Verify database was updated correctly
      const exclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher._id.toString(),
        excludedForPublisherId: publisher1._id.toString(),
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
        excludedForPublisherId: publisher1._id.toString(),
        excludedForPublisherName: publisher1.name,
        organizationClientId: otherOrganizationClientId,
        organizationName: publisher.name,
      });

      // Include publisher1 in the test organization
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set("x-api-key", apiKey)
        .send({ publisherIds: [publisher1._id.toString()] });

      expect(response.status).toBe(200);

      // Other organization exclusion should still exist
      const otherExclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: otherPublisherId,
        excludedForPublisherId: publisher1._id.toString(),
        organizationClientId: otherOrganizationClientId,
      });
      expect(otherExclusion).toBeDefined();

      // Test organization should not have exclusion
      const testExclusion = await OrganizationExclusionModel.findOne({
        excludedByPublisherId: publisher._id.toString(),
        excludedForPublisherId: publisher1._id.toString(),
        organizationClientId: orgId,
      });
      expect(testExclusion).toBeNull();
    });
  });
});
