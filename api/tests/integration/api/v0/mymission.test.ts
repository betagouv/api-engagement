import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import elasticMock from "../../../mocks/elasticMock";
import { createTestApp } from "../../../testApp";

describe("MyMission API Integration Tests", () => {
  const app = createTestApp();
  let publisher: any;
  let apiKey: string;
  let mission1: any;
  let mission2: any;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey;
    const orgId = "test-org-id";
    mission1 = await createTestMission({ organizationClientId: orgId, publisherId: publisher._id.toString() });
    mission2 = await createTestMission({ organizationClientId: orgId, publisherId: publisher._id.toString() });

    vi.clearAllMocks();
    elasticMock.msearch.mockResolvedValue({
      body: {
        responses: [
          {
            aggregations: {
              apply: {
                data: {
                  buckets: [],
                },
              },
              click: {
                data: {
                  buckets: [],
                },
              },
            },
          },
        ],
      },
    });
  });

  /**
   * GET /v0/mymission
   * - should return 401 if not authenticated
   * - should return list of missions for the publisher with correct format
   * - should respect limit and skip parameters
   * - should return 400 for invalid query parameters
   */
  describe("GET /v0/mymission", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/v0/mymission");
      expect(response.status).toBe(401);
    });

    it("should return list of missions for the publisher with correct format", async () => {
      const response = await request(app).get("/v0/mymission").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.limit).toBe(50);
      expect(response.body.skip).toBe(0);

      const mission = response.body.data[0];
      validateMissionStructure(mission);
    });

    it("should respect limit and skip parameters", async () => {
      const response1 = await request(app).get("/v0/mymission?limit=1").set("x-api-key", apiKey);
      expect(response1.status).toBe(200);
      expect(response1.body.data.length).toBe(1);
      expect(response1.body.limit).toBe(1);

      const response2 = await request(app).get("/v0/mymission?skip=1").set("x-api-key", apiKey);
      expect(response2.status).toBe(200);
      expect(response2.body.skip).toBe(1);
      expect(response2.body.data.length).toBeGreaterThanOrEqual(1);

      const firstMissionId = response1.body.data[0]._id;
      const secondResponseIds = response2.body.data.map((m: any) => m._id);
      expect(secondResponseIds).not.toContain(firstMissionId);
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await request(app).get("/v0/mymission?limit=invalid").set("x-api-key", apiKey);
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_QUERY");
    });
  });

  /**
   * GET /v0/mymission/:clientId
   * - should return 401 if not authenticated
   * - should return 404 if mission not found
   * - should return mission details with stats
   * - should return 400 for invalid parameters
   */
  describe("GET /v0/mymission/:clientId", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/v0/mymission/${mission1.clientId}`);
      expect(response.status).toBe(401);
    });

    it("should return 404 if mission not found", async () => {
      const response = await request(app).get("/v0/mymission/non-existent-id").set("x-api-key", apiKey);
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });

    it("should return mission details with stats", async () => {
      // Mock ES reponse with stats
      elasticMock.msearch.mockResolvedValueOnce({
        body: {
          responses: [
            {
              aggregations: {
                apply: {
                  data: {
                    buckets: [
                      {
                        key: "publisher1",
                        doc_count: 5,
                        hits: {
                          hits: {
                            hits: [
                              {
                                _source: {
                                  fromPublisherLogo: "logo1.png",
                                  fromPublisherName: "Publisher 1",
                                  fromPublisherUrl: "https://publisher1.com",
                                },
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
                click: {
                  data: {
                    buckets: [
                      {
                        key: "publisher2",
                        doc_count: 3,
                        hits: {
                          hits: {
                            hits: [
                              {
                                _source: {
                                  fromPublisherLogo: "logo2.png",
                                  fromPublisherName: "Publisher 2",
                                  fromPublisherUrl: "https://publisher2.com",
                                },
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      });

      const response = await request(app).get(`/v0/mymission/${mission1.clientId}`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();

      const mission = response.body.data;
      validateMissionStructure(mission);
      validateStatsStructure(mission.stats);
    });

    it("should return 400 for invalid parameters", async () => {
      const response = await request(app).get(`/v0/mymission/${mission1.clientId}`).set("x-api-key", apiKey).query({ someInvalidParam: "value" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  /**
   * GET /v0/mymission/:clientId/stats
   * - should return 401 if not authenticated
   * - should return 404 if mission not found
   * - should return mission stats
   * - should return 400 for invalid parameters
   */
  describe("GET /v0/mymission/:clientId/stats", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/v0/mymission/${mission1.clientId}/stats`);
      expect(response.status).toBe(401);
    });

    it("should return 404 if mission not found", async () => {
      const response = await request(app).get("/v0/mymission/non-existent-id/stats").set("x-api-key", apiKey);
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return mission stats", async () => {
      // Mock ES response with stats
      elasticMock.msearch.mockResolvedValueOnce({
        body: {
          responses: [
            {
              aggregations: {
                mission: {
                  buckets: [
                    { key: "publisher1", doc_count: 5 },
                    { key: "publisher2", doc_count: 3 },
                  ],
                },
              },
            },
            {
              aggregations: {
                mission: {
                  buckets: [
                    { key: "publisher1", doc_count: 2 },
                    { key: "publisher3", doc_count: 1 },
                  ],
                },
              },
            },
          ],
        },
      });

      const response = await request(app).get(`/v0/mymission/${mission1.clientId}/stats`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();

      validateStatsStructure(response.body.data);
    });

    it("should return 400 for invalid parameters", async () => {
      const response = await request(app).get(`/v0/mymission/${mission1.clientId}/stats`).set("x-api-key", apiKey).query({ someInvalidParam: "value" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
});

function validateMissionStructure(mission: any) {
  expect(mission).toHaveProperty("_id");
  expect(mission).toHaveProperty("id");
  expect(mission).toHaveProperty("clientId");
  expect(mission).toHaveProperty("publisherId");

  expect(mission).toHaveProperty("organizationName");
  expect(mission).toHaveProperty("organizationId");
  expect(mission).toHaveProperty("organizationClientId");

  expect(mission).toHaveProperty("title");
  expect(mission).toHaveProperty("description");
  expect(mission).toHaveProperty("type");
  expect(mission).toHaveProperty("domain");
  expect(mission).toHaveProperty("activity");

  expect(mission).toHaveProperty("addresses");
  expect(mission).toHaveProperty("city");
  expect(mission).toHaveProperty("postalCode");
  expect(mission).toHaveProperty("departmentCode");
  expect(mission).toHaveProperty("departmentName");
  expect(mission).toHaveProperty("region");

  expect(mission).toHaveProperty("createdAt");
  expect(mission).toHaveProperty("updatedAt");
  expect(mission).toHaveProperty("postedAt");
  expect(mission).toHaveProperty("startAt");
  expect(mission).toHaveProperty("endAt");

  expect(mission).toHaveProperty("statusCode");
  expect(mission).toHaveProperty("moderation_5f5931496c7ea514150a818f_status");

  expect(mission).toHaveProperty("publisherName");
  expect(mission).toHaveProperty("publisherUrl");
  expect(mission).toHaveProperty("publisherLogo");

  expect(mission).toHaveProperty("places");
  expect(mission).toHaveProperty("remote");
  expect(mission).toHaveProperty("tasks");
  expect(mission).toHaveProperty("applicationUrl");
  expect(mission).toHaveProperty("duration");
  expect(mission).toHaveProperty("schedule");
  expect(mission).toHaveProperty("tags");
  expect(mission).toHaveProperty("softSkills");
  expect(mission).toHaveProperty("romeSkills");
  expect(mission).toHaveProperty("requirements");

  expect(typeof mission._id).toBe("string");
  expect(typeof mission.clientId).toBe("string");
  expect(typeof mission.publisherId).toBe("string");
  expect(typeof mission.title).toBe("string");

  expect(Array.isArray(mission.addresses)).toBe(true);
  expect(Array.isArray(mission.tags)).toBe(true);
  expect(Array.isArray(mission.softSkills)).toBe(true);
  expect(Array.isArray(mission.romeSkills)).toBe(true);
  expect(Array.isArray(mission.requirements)).toBe(true);
}

function validateStatsStructure(stats: any) {
  expect(stats).toHaveProperty("clicks");
  expect(stats).toHaveProperty("applications");
  expect(Array.isArray(stats.clicks)).toBe(true);
  expect(Array.isArray(stats.applications)).toBe(true);

  if (stats.clicks.length > 0) {
    const click = stats.clicks[0];
    expect(click).toHaveProperty("key");
    expect(click).toHaveProperty("doc_count");

    if (click.logo !== undefined) {
      expect(click).toHaveProperty("logo");
      expect(click).toHaveProperty("name");
      expect(click).toHaveProperty("url");
    }
  }

  if (stats.applications.length > 0) {
    const application = stats.applications[0];
    expect(application).toHaveProperty("key");
    expect(application).toHaveProperty("doc_count");

    if (application.logo !== undefined) {
      expect(application).toHaveProperty("logo");
      expect(application).toHaveProperty("name");
      expect(application).toHaveProperty("url");
    }
  }
}
