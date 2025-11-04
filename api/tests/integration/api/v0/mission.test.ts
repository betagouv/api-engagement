import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Mission, MissionType } from "../../../../src/types";
import type { PublisherRecord } from "../../../../src/types/publisher";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("Mission API Integration Tests", () => {
  const app = createTestApp();
  let publisher: PublisherRecord;
  let apiKey: string;
  let mission1: Mission;
  let mission2: Mission;
  let mission3: Mission;

  beforeEach(async () => {
    // Create publishers
    const publisher1 = await createTestPublisher({ name: "Publisher A" });
    const publisher2 = await createTestPublisher({ name: "Publisher B" });

    // Create a main publisher for testing who has access to both
    publisher = await createTestPublisher({
      name: "Main Publisher",
      publishers: [
        {
          publisherId: publisher1.id,
          publisherName: "Publisher A",
          moderator: true,
          missionType: MissionType.BENEVOLAT,
        },
        {
          publisherId: publisher2.id,
          publisherName: "Publisher B",
          moderator: true,
          missionType: MissionType.BENEVOLAT,
        },
      ],
    });
    apiKey = publisher.apikey!;

    // Create missions
    mission1 = await createTestMission({
      organizationClientId: "org-1",
      publisherId: publisher1.id,
      title: "Mission in Paris",
      city: "Paris",
      domain: "culture",
      activity: "arts",
      type: MissionType.BENEVOLAT,
      organizationRNA: "W123456789",
      organizationStatusJuridique: "Association",
      remote: "no",
      openToMinors: "no",
      reducedMobilityAccessible: "yes",
      startAt: new Date("2024-01-10"),
      endAt: new Date("2024-02-10"),
      addresses: [
        {
          street: "1 Place de l'Hôtel de Ville",
          city: "Paris",
          departmentName: "Paris",
          departmentCode: "75",
          region: "Île-de-France",
          country: "France",
          location: { lat: 48.8566, lon: 2.3522 },
          geoPoint: { type: "Point", coordinates: [2.3522, 48.8566] },
          postalCode: "75004",
          geolocStatus: "ENRICHED_BY_PUBLISHER",
        },
      ],
    });

    mission2 = await createTestMission({
      organizationClientId: "org-2",
      publisherId: publisher2.id,
      title: "Mission in Lyon",
      city: "Lyon",
      domain: "sport",
      openToMinors: "no",
      addresses: [
        {
          street: "1 rue de la république",
          city: "Lyon",
          postalCode: "69001",
          departmentName: "Rhône",
          departmentCode: "69",
          region: "Auvergne-Rhône-Alpes",
          country: "France",
          location: { lat: 45.767, lon: 4.836 },
          geoPoint: { type: "Point", coordinates: [4.836, 45.767] },
          geolocStatus: "ENRICHED_BY_PUBLISHER",
        },
      ],
    });

    mission3 = await createTestMission({
      organizationClientId: "org-3",
      publisherId: publisher1.id,
      title: "Another mission in Paris",
      city: "Paris",
      domain: "environment",
      openToMinors: "no",
      addresses: [
        {
          street: "1 Avenue des Champs-Élysées",
          city: "Paris",
          departmentName: "Paris",
          departmentCode: "75",
          region: "Île-de-France",
          country: "France",
          location: { lat: 48.8699, lon: 2.3073 },
          geoPoint: { type: "Point", coordinates: [2.3073, 48.8699] },
          postalCode: "75008",
          geolocStatus: "ENRICHED_BY_PUBLISHER",
        },
      ],
    });

    vi.clearAllMocks();
  });

  describe("GET /v0/mission", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/v0/mission");
      expect(response.status).toBe(401);
    });

    it("should return a list of missions with correct format", async () => {
      const response = await request(app).get("/v0/mission").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.data.length).toBe(3);
      expect(response.body.limit).toBe(25);
      expect(response.body.skip).toBe(0);

      validateMissionStructure(response.body.data[0]);
    });

    it("should respect limit and skip parameters", async () => {
      const response1 = await request(app).get("/v0/mission?limit=1").set("x-api-key", apiKey);
      expect(response1.status).toBe(200);
      expect(response1.body.data.length).toBe(1);
      expect(response1.body.limit).toBe(1);

      const response2 = await request(app).get("/v0/mission?skip=1").set("x-api-key", apiKey);
      expect(response2.status).toBe(200);
      expect(response2.body.skip).toBe(1);
      expect(response2.body.data.length).toBe(2);

      const firstMissionId = response1.body.data[0]._id;
      const secondResponseIds = response2.body.data.map((m: any) => m._id);
      expect(secondResponseIds).not.toContain(firstMissionId);
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await request(app).get("/v0/mission?limit=invalid").set("x-api-key", apiKey);
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should return 400 if publisher has no access", async () => {
      const noAccessPublisher = await createTestPublisher({ publishers: [] });
      const response = await request(app).get("/v0/mission").set("x-api-key", noAccessPublisher.apikey!);
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NO_PARTNER");
    });

    it("should filter by domain", async () => {
      const response = await request(app).get("/v0/mission?domain=culture").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission1._id!.toString());
    });

    it("should filter by city", async () => {
      const response = await request(app).get("/v0/mission?city=Paris").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      const ids = response.body.data.map((m: any) => m._id!);
      expect(ids).toContain(mission1._id!.toString());
      expect(ids).toContain(mission3._id!.toString());
    });

    it("should filter by publisherId", async () => {
      const publisherIdToFilter = publisher.publishers[1].publisherId;
      const response = await request(app).get(`/v0/mission?publisher=${publisherIdToFilter}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by keywords", async () => {
      const response = await request(app).get("/v0/mission?keywords=Lyon").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by location", async () => {
      // Near Lyon
      const response = await request(app).get("/v0/mission?lat=45.767&lon=4.836&distance=10km").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by activity", async () => {
      await createTestMission({ organizationClientId: "org-4", publisherId: publisher.publishers[0].publisherId, activity: "education" });
      const response = await request(app).get("/v0/mission?activity=education").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].activity).toBe("education");
    });

    it("should filter by clientId", async () => {
      const specificClientId = "client-abc-123";
      await createTestMission({ organizationClientId: "org-5", publisherId: publisher.publishers[0].publisherId, clientId: specificClientId });
      const response = await request(app).get(`/v0/mission?clientId=${specificClientId}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].clientId).toBe(specificClientId);
    });

    it("should filter by country", async () => {
      const response = await request(app).get("/v0/mission?country=France").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by departmentName", async () => {
      const response = await request(app).get("/v0/mission?departmentName=Rhône").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by organizationRNA", async () => {
      const specificRNA = "W987654321";
      await createTestMission({ organizationClientId: "org-6", publisherId: publisher.publishers[0].publisherId, organizationRNA: specificRNA });
      const response = await request(app).get(`/v0/mission?organizationRNA=${specificRNA}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].organizationRNA).toBe(specificRNA);
    });

    it("should filter by organizationStatusJuridique", async () => {
      await createTestMission({ organizationClientId: "org-7", publisherId: publisher.publishers[0].publisherId, organizationStatusJuridique: "Fondation" });
      const response = await request(app).get("/v0/mission?organizationStatusJuridique=Fondation").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].organizationStatusJuridique).toBe("Fondation");
    });

    it("should filter by openToMinors", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, openToMinors: "yes" });
      const response = await request(app).get("/v0/mission?openToMinors=yes").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].openToMinors).toBe("yes");
    });

    it("should filter by remote", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, remote: "full" });
      const response = await request(app).get("/v0/mission?remote=full").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].remote).toBe("full");
    });

    it("should filter by reducedMobilityAccessible", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, reducedMobilityAccessible: "no" });
      const response = await request(app).get("/v0/mission?reducedMobilityAccessible=no").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].reducedMobilityAccessible).toBe("no");
    });

    it("should filter by snu", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, snu: true });
      const response = await request(app).get("/v0/mission/?snu=true").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by type", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, type: MissionType.VOLONTARIAT });
      const response = await request(app).get(`/v0/mission?type=${MissionType.VOLONTARIAT}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].type).toBe(MissionType.VOLONTARIAT);
    });

    it("should filter by createdAt (gt)", async () => {
      const date = new Date();
      date.setSeconds(date.getSeconds() - 1);
      const response = await request(app).get(`/v0/mission?createdAt=gt:${date.toISOString()}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by startAt (lt)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const response = await request(app).get(`/v0/mission?startAt=lt:${futureDate.toISOString()}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });
  });

  describe("GET /v0/mission/search", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/v0/mission/search");
      expect(response.status).toBe(401);
    });

    it("should return a list of missions with correct format and facets", async () => {
      const response = await request(app).get("/v0/mission/search").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.hits)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.hits.length).toBe(3);

      // Check facets
      expect(response.body.facets).toBeDefined();
      expect(response.body.facets.domains).toBeDefined();
      expect(response.body.facets.activities).toBeDefined();
      expect(response.body.facets.departmentName).toBeDefined();

      // Check each hit is well formed
      response.body.hits.forEach((hit: any) => {
        validateMissionStructure(hit);
      });
    });

    it("should filter by keywords", async () => {
      const response = await request(app).get("/v0/mission/search?keywords=Lyon").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by geo-location", async () => {
      // Near Lyon
      const response = await request(app).get("/v0/mission/search?lat=45.76&lon=4.83&distance=10km").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2._id!.toString());
      expect(response.body.hits[0]._distance).toBeLessThan(1);
    });

    it("should respect limit and skip parameters", async () => {
      const response = await request(app).get("/v0/mission/search?limit=1&skip=1").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.hits.length).toBe(1);
      expect(response.body.total).toBe(3);
    });

    it("should filter by activity", async () => {
      const response = await request(app).get("/v0/mission/search?activity=arts").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission1._id!.toString());
    });

    it("should filter by city", async () => {
      const response = await request(app).get("/v0/mission/search?city=Paris").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
    });

    it("should filter by clientId", async () => {
      const response = await request(app).get("/v0/mission/search?clientId=org-1").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission1._id!.toString());
    });

    it("should filter by multiple clientIds", async () => {
      const response = await request(app).get("/v0/mission/search?clientId=org-1,org-3").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      const clientIds = response.body.hits.map((h: any) => h.organizationClientId);
      expect(clientIds).toContain("org-1");
      expect(clientIds).toContain("org-3");
    });

    it("should filter by country", async () => {
      const response = await request(app).get("/v0/mission/search?country=France").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by departmentName", async () => {
      const response = await request(app).get("/v0/mission/search?departmentName=Rhône").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by domain", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, domain: "arts" });
      const response = await request(app).get("/v0/mission/search?domain=arts").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by openToMinors", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, openToMinors: "yes" });
      const response = await request(app).get("/v0/mission/search?openToMinors=yes").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0].openToMinors).toBe("yes");
    });

    it("should filter by organizationRNA", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, organizationRNA: "XXX" });
      const response = await request(app).get("/v0/mission/search?organizationRNA=XXX").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by organizationStatusJuridique", async () => {
      await createTestMission({ organizationClientId: "org-7", publisherId: publisher.publishers[0].publisherId, organizationStatusJuridique: "Fondation" });
      const response = await request(app).get("/v0/mission/search?organizationStatusJuridique=Fondation").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by publisher", async () => {
      const response = await request(app).get(`/v0/mission/search?publisher=${mission2.publisherId}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2._id!.toString());
    });

    it("should filter by remote", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, remote: "full" });
      const response = await request(app).get("/v0/mission/search?remote=full").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by reducedMobilityAccessible", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, reducedMobilityAccessible: "no" });
      const response = await request(app).get("/v0/mission/search?reducedMobilityAccessible=no").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by startAt (gt)", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, startAt: new Date("2028-01-01") });
      const response = await request(app).get("/v0/mission/search?startAt=gt:2027-12-31").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by type", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, type: MissionType.VOLONTARIAT });
      const response = await request(app).get(`/v0/mission/search?type=${MissionType.VOLONTARIAT}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });
  });

  describe("GET /v0/mission/:id", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(`/v0/mission/${mission1._id}`);
      expect(response.status).toBe(401);
    });

    it("should return an existing mission with correct format", async () => {
      const response = await request(app).get(`/v0/mission/${mission1._id}`).set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(typeof response.body.data === "object").toBe(true);
      expect(response.body.data._id).toBe(mission1._id?.toString());

      validateMissionStructure(response.body.data);
    });

    it("should return 404 for unknown id parameter", async () => {
      const id = generateFakeObjectId([mission1, mission2, mission3]);
      const response = await request(app).get(`/v0/mission/${id}`).set("x-api-key", apiKey);
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });
});

function validateMissionStructure(mission: any) {
  expect(mission).toHaveProperty("_id");
  expect(mission).toHaveProperty("clientId");
  expect(mission).toHaveProperty("activity");
  expect(mission).toHaveProperty("addresses");
  expect(Array.isArray(mission.addresses)).toBe(true);
  mission.addresses.forEach((address: any) => {
    expect(address).toHaveProperty("street");
    expect(address).toHaveProperty("city");
    expect(address).toHaveProperty("postalCode");
    expect(address).toHaveProperty("departmentName");
    expect(address).toHaveProperty("departmentCode");
    expect(address).toHaveProperty("region");
    expect(address).toHaveProperty("country");
    expect(address).toHaveProperty("location");
    expect(address.location).toHaveProperty("lat");
    expect(address.location).toHaveProperty("lon");
    expect(address).toHaveProperty("geoPoint");
    expect(address.geoPoint).toHaveProperty("type");
    expect(address.geoPoint).toHaveProperty("coordinates");
    expect(address).toHaveProperty("geolocStatus");
  });
  expect(mission).toHaveProperty("applicationUrl");
  expect(mission).toHaveProperty("audience");
  expect(mission).toHaveProperty("closeToTransport");
  expect(mission).toHaveProperty("createdAt");
  expect(mission).toHaveProperty("deleted");
  expect(mission).toHaveProperty("deletedAt");
  expect(mission).toHaveProperty("description");
  expect(mission).toHaveProperty("descriptionHtml");
  expect(mission).toHaveProperty("domain");
  expect(mission).toHaveProperty("domainLogo");
  expect(mission).toHaveProperty("endAt");
  expect(mission).toHaveProperty("lastSyncAt");
  expect(mission).toHaveProperty("metadata");
  expect(mission).toHaveProperty("openToMinors");
  expect(mission).toHaveProperty("organizationActions");
  expect(mission).toHaveProperty("organizationBeneficiaries");
  expect(mission).toHaveProperty("organizationCity");
  expect(mission).toHaveProperty("organizationClientId");
  expect(mission).toHaveProperty("organizationDescription");
  expect(mission).toHaveProperty("organizationFullAddress");
  expect(mission).toHaveProperty("organizationId");
  expect(mission).toHaveProperty("organizationLogo");
  expect(mission).toHaveProperty("organizationName");
  expect(mission).toHaveProperty("organizationPostCode");
  expect(mission).toHaveProperty("organizationRNA");
  expect(mission).toHaveProperty("organizationReseaux");
  expect(mission).toHaveProperty("organizationSiren");
  expect(mission).toHaveProperty("organizationStatusJuridique");
  expect(mission).toHaveProperty("organizationType");
  expect(mission).toHaveProperty("organizationUrl");
  expect(mission).toHaveProperty("places");
  expect(mission).toHaveProperty("postedAt");
  expect(mission).toHaveProperty("priority");
  expect(mission).toHaveProperty("publisherId");
  expect(mission).toHaveProperty("publisherLogo");
  expect(mission).toHaveProperty("publisherName");
  expect(mission).toHaveProperty("publisherUrl");
  expect(mission).toHaveProperty("reducedMobilityAccessible");
  expect(mission).toHaveProperty("remote");
  expect(mission).toHaveProperty("schedule");
  expect(mission).toHaveProperty("snu");
  expect(mission).toHaveProperty("snuPlaces");
  expect(mission).toHaveProperty("softSkills");
  expect(mission).toHaveProperty("romeSkills");
  expect(mission).toHaveProperty("requirements");
  expect(mission).toHaveProperty("startAt");
  expect(mission).toHaveProperty("statusCode");
  expect(mission).toHaveProperty("statusComment");
  expect(mission).toHaveProperty("statusCommentHistoric");
  mission.statusCommentHistoric.forEach((comment: any) => {
    expect(comment).toHaveProperty("status");
    expect(comment).toHaveProperty("comment");
    expect(comment).toHaveProperty("date");
  });
  expect(mission).toHaveProperty("tags");
  expect(mission).toHaveProperty("tasks");
  expect(mission).toHaveProperty("title");
  expect(mission).toHaveProperty("updatedAt");

  expect(Array.isArray(mission.audience)).toBe(true);
  expect(Array.isArray(mission.organizationActions)).toBe(true);
  expect(Array.isArray(mission.organizationBeneficiaries)).toBe(true);
  expect(Array.isArray(mission.organizationReseaux)).toBe(true);
  expect(Array.isArray(mission.requirements)).toBe(true);
  expect(Array.isArray(mission.romeSkills)).toBe(true);
  expect(Array.isArray(mission.softSkills)).toBe(true);
  expect(Array.isArray(mission.statusCommentHistoric)).toBe(true);
  expect(Array.isArray(mission.tags)).toBe(true);
  expect(Array.isArray(mission.tasks)).toBe(true);
}

function generateFakeObjectId(existingMissions: Mission[]) {
  const existingIds = existingMissions.map((m) => m._id?.toString());
  let id: mongoose.Types.ObjectId = new mongoose.Types.ObjectId();

  while (existingIds.includes(id.toString())) {
    id = new mongoose.Types.ObjectId();
  }

  return id;
}
