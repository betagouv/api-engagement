import { randomUUID } from "crypto";
import request from "supertest";

import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";
import { missionModerationStatusService } from "@/services/mission-moderation-status";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import type { MissionRecord, PublisherRecord } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestMission, createTestPublisher } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

describe("Mission API Integration Tests", () => {
  const app = createTestApp({ syncMissionDiffusion: true });
  const authenticatedGet = (path: string, apiKey: string) => request(app).get(path).set("x-api-key", apiKey);
  let publisher: PublisherRecord;
  let apiKey: string;
  let mission1: MissionRecord;
  let mission2: MissionRecord;
  let mission3: MissionRecord;

  beforeEach(async () => {
    // Create publishers
    const publisher1 = await createTestPublisher({ name: "Publisher A" });
    const publisher2 = await createTestPublisher({ name: "Publisher B" });

    // Create a main publisher for testing who has access to both
    publisher = await createTestPublisher({
      name: "Main Publisher",
      publishers: [{ publisherId: publisher1.id }, { publisherId: publisher2.id }],
    });
    apiKey = publisher.apikey!;

    // Create missions
    mission1 = await createTestMission({
      organizationClientId: "org-1",
      publisherId: publisher1.id,
      title: "Mission in Paris",
      city: "Paris",
      domain: "culture",
      activities: ["arts"],
      type: "benevolat",
      organizationRNA: "W123456789",
      organizationStatusJuridique: "Association",
      remote: "no",
      openToMinors: false,
      reducedMobilityAccessible: true,
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
      compensationAmount: 90,
      compensationUnit: "day",
      compensationType: "net",
    });

    mission2 = await createTestMission({
      organizationClientId: "org-2",
      publisherId: publisher2.id,
      title: "Mission in Lyon",
      city: "Lyon",
      domain: "sport",
      openToMinors: false,
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
      openToMinors: false,
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
      const response = await authenticatedGet("/v0/mission", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.data.length).toBe(3);
      expect(response.body.limit).toBe(25);
      expect(response.body.skip).toBe(0);

      validateMissionStructure(response.body.data[0]);
    });

    it("should return missions from multiple PublisherDiffusion partners when diffusion rules define multiple publisher scopes", async () => {
      const annonceurA = await createTestPublisher({ name: "Scoped Publisher A" });
      const annonceurB = await createTestPublisher({ name: "Scoped Publisher B" });
      const diffuseur = await createTestPublisher({
        name: "Scoped Diffuseur",
        publishers: [{ publisherId: annonceurA.id }, { publisherId: annonceurB.id }],
      });

      const scopedMissionA = await createTestMission({
        publisherId: annonceurA.id,
        title: "Scoped mission A",
        clientId: `scoped-${randomUUID()}`,
      });
      const scopedMissionB = await createTestMission({
        publisherId: annonceurB.id,
        title: "Scoped mission B",
        clientId: `scoped-${randomUUID()}`,
      });

      // Les scope roots (un par annonceur) sont créés par createTestPublisher à partir de `publishers`
      const roots = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null, field: "publisherId" });
      expect(roots.map((rule) => rule.value).sort()).toEqual([annonceurA.id, annonceurB.id].sort());

      const response = await authenticatedGet("/v0/mission", diffuseur.apikey!);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBe(2);
      const ids = response.body.data.map((mission: any) => mission._id);
      expect(ids).toEqual(expect.arrayContaining([scopedMissionA.id, scopedMissionB.id]));
    });

    it("should apply organization exclusions when listing multiple diffusion scopes", async () => {
      const annonceurA = await createTestPublisher({ name: "Excluded List Publisher A" });
      const annonceurB = await createTestPublisher({ name: "Excluded List Publisher B" });
      const diffuseur = await createTestPublisher({
        name: "Excluded List Diffuseur",
        publishers: [{ publisherId: annonceurA.id }, { publisherId: annonceurB.id }],
      });

      const includedMissionA = await createTestMission({
        publisherId: annonceurA.id,
        title: "Included mission A",
        clientId: `included-a-${randomUUID()}`,
        startAt: new Date("2026-01-03"),
      });
      const excludedMissionB = await createTestMission({
        organizationClientId: `excluded-org-${randomUUID()}`,
        publisherId: annonceurB.id,
        title: "Excluded mission B",
        clientId: `excluded-b-${randomUUID()}`,
        startAt: new Date("2026-01-02"),
      });
      const includedMissionB = await createTestMission({
        organizationClientId: `included-org-${randomUUID()}`,
        publisherId: annonceurB.id,
        title: "Included mission B",
        clientId: `included-b-${randomUUID()}`,
        startAt: new Date("2026-01-01"),
      });

      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur.id,
        annonceurPublisherId: annonceurB.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: excludedMissionB.organizationClientId!,
      });

      const response = await authenticatedGet("/v0/mission", diffuseur.apikey!);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      const ids = response.body.data.map((mission: any) => mission._id);
      expect(ids).toEqual(expect.arrayContaining([includedMissionA.id, includedMissionB.id]));
      expect(ids).not.toContain(excludedMissionB.id);
    });

    it("should expose compensation fields on missions", async () => {
      const response = await authenticatedGet("/v0/mission", apiKey);
      expect(response.status).toBe(200);
      const target = response.body.data.find((mission: any) => mission._id === mission1.id);
      expect(target).toBeDefined();
      expect(target.compensationAmount).toBe(90);
      expect(target.compensationUnit).toBe("day");
      expect(target.compensationType).toBe("net");
    });

    it("should respect limit and skip parameters", async () => {
      const response1 = await authenticatedGet("/v0/mission?limit=1", apiKey);
      expect(response1.status).toBe(200);
      expect(response1.body.data.length).toBe(1);
      expect(response1.body.limit).toBe(1);

      const response2 = await authenticatedGet("/v0/mission?skip=1", apiKey);
      expect(response2.status).toBe(200);
      expect(response2.body.skip).toBe(1);
      expect(response2.body.data.length).toBe(2);

      const firstMissionId = response1.body.data[0]._id;
      const secondResponseIds = response2.body.data.map((m: any) => m._id);
      expect(secondResponseIds).not.toContain(firstMissionId);
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await authenticatedGet("/v0/mission?limit=invalid", apiKey);
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should use the materialized own scope when publisher has no live partner", async () => {
      const noAccessPublisher = await createTestPublisher({ publishers: [] });
      const ownMission = await createTestMission({ publisherId: noAccessPublisher.id, title: "Own snapshot mission" });
      const response = await authenticatedGet("/v0/mission", noAccessPublisher.apikey!);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(ownMission.id);
    });

    it("should filter by domain", async () => {
      const response = await authenticatedGet("/v0/mission?domain=culture", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission1.id);
    });

    it("should filter by city", async () => {
      const response = await authenticatedGet("/v0/mission?city=Paris", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      const ids = response.body.data.map((m: any) => m._id!);
      expect(ids).toContain(mission1.id);
      expect(ids).toContain(mission3.id);
    });

    it("should filter by publisherId", async () => {
      const publisherIdToFilter = publisher.publishers[1].publisherId;
      const response = await authenticatedGet(`/v0/mission?publisher=${publisherIdToFilter}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2.id);
    });

    it("should return no missions when publisher filter is outside diffusion scopes", async () => {
      const outsidePublisher = await createTestPublisher({ name: "Outside Publisher" });
      await createTestMission({ publisherId: outsidePublisher.id, title: "Outside mission", clientId: `outside-${randomUUID()}` });

      const response = await authenticatedGet(`/v0/mission?publisher=${outsidePublisher.id}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it("should filter by keywords", async () => {
      const response = await authenticatedGet("/v0/mission?keywords=Lyon", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2.id);
    });

    it("should filter by location", async () => {
      // Near Lyon
      const response = await authenticatedGet("/v0/mission?lat=45.767&lon=4.836&distance=10km", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2.id);
    });

    it("should filter by activity", async () => {
      await createTestMission({ organizationClientId: "org-4", publisherId: publisher.publishers[0].publisherId, activities: ["education"] });
      const response = await authenticatedGet("/v0/mission?activity=education", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].activity).toBe("education");
    });

    it("should filter by clientId", async () => {
      const specificClientId = "client-abc-123";
      await createTestMission({ organizationClientId: "org-5", publisherId: publisher.publishers[0].publisherId, clientId: specificClientId });
      const response = await authenticatedGet(`/v0/mission?clientId=${specificClientId}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].clientId).toBe(specificClientId);
    });

    it("should filter by country", async () => {
      const response = await authenticatedGet("/v0/mission?country=France", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by departmentName", async () => {
      const response = await authenticatedGet("/v0/mission?departmentName=Rhône", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0]._id).toBe(mission2.id);
    });

    it("should filter by organizationRNA", async () => {
      const specificRNA = "W987654321";
      await createTestMission({ organizationClientId: "org-6", publisherId: publisher.publishers[0].publisherId, organizationRNA: specificRNA });
      const response = await authenticatedGet(`/v0/mission?organizationRNA=${specificRNA}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].organizationRNA).toBe(specificRNA);
    });

    it("should filter by organizationStatusJuridique", async () => {
      await createTestMission({ organizationClientId: "org-7", publisherId: publisher.publishers[0].publisherId, organizationStatusJuridique: "Fondation" });
      const response = await authenticatedGet("/v0/mission?organizationStatusJuridique=Fondation", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].organizationStatusJuridique).toBe("Fondation");
    });

    it("should filter by openToMinors", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, openToMinors: true });
      const response = await authenticatedGet("/v0/mission?openToMinors=yes", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].openToMinors).toBe("yes");
    });

    it("should filter by remote", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, remote: "full" });
      const response = await authenticatedGet("/v0/mission?remote=full", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].remote).toBe("full");
    });

    it("should filter by reducedMobilityAccessible", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, reducedMobilityAccessible: false });
      const response = await authenticatedGet("/v0/mission?reducedMobilityAccessible=no", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].reducedMobilityAccessible).toBe("no");
    });

    it("should filter by snu", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, snu: true });
      const response = await authenticatedGet("/v0/mission/?snu=true", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by type", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, type: "volontariat_service_civique" });
      const response = await authenticatedGet(`/v0/mission?type=${"volontariat_service_civique"}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].type).toBe("volontariat_service_civique");
    });

    it("should return 400 for an invalid type value", async () => {
      const response = await authenticatedGet("/v0/mission?type=volontariat", apiKey);
      expect(response.status).toBe(400);
    });

    it("should filter by createdAt (gt)", async () => {
      const date = new Date();
      date.setSeconds(date.getSeconds() - 1);
      const response = await authenticatedGet(`/v0/mission?createdAt=gt:${date.toISOString()}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by startAt (lt)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const response = await authenticatedGet(`/v0/mission?startAt=lt:${futureDate.toISOString()}`, apiKey);
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
      const response = await authenticatedGet("/v0/mission/search", apiKey);

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

    it("should expose compensation fields within search results", async () => {
      const response = await authenticatedGet("/v0/mission/search", apiKey);
      expect(response.status).toBe(200);
      const target = response.body.hits.find((mission: any) => mission._id === mission1.id);
      expect(target).toBeDefined();
      expect(target.compensationAmount).toBe(90);
      expect(target.compensationUnit).toBe("day");
      expect(target.compensationType).toBe("net");
    });

    it("should filter by keywords", async () => {
      const response = await authenticatedGet("/v0/mission/search?keywords=Lyon", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2.id);
    });

    it("should filter by geo-location", async () => {
      // Near Lyon
      const response = await authenticatedGet("/v0/mission/search?lat=45.76&lon=4.83&distance=10km", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2.id);
      expect(response.body.hits[0]._distance).toBeLessThan(1);
    });

    it("should respect limit and skip parameters", async () => {
      const response = await authenticatedGet("/v0/mission/search?limit=1&skip=1", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.hits.length).toBe(1);
      expect(response.body.total).toBe(3);
    });

    it("should filter by activity", async () => {
      const response = await authenticatedGet("/v0/mission/search?activity=arts", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission1.id);
    });

    it("should filter by city", async () => {
      const response = await authenticatedGet("/v0/mission/search?city=Paris", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
    });

    it("should filter by clientId", async () => {
      const response = await authenticatedGet(`/v0/mission/search?clientId=${mission1.clientId}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission1.id);
    });

    it("should filter by multiple clientIds", async () => {
      const response = await authenticatedGet(`/v0/mission/search?clientId=${mission1.clientId},${mission3.clientId}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      const clientIds = response.body.hits.map((h: any) => h.clientId);
      expect(clientIds).toContain(mission1.clientId);
      expect(clientIds).toContain(mission3.clientId);
    });

    it("should filter by country", async () => {
      const response = await authenticatedGet("/v0/mission/search?country=France", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
    });

    it("should filter by departmentName", async () => {
      const response = await authenticatedGet("/v0/mission/search?departmentName=Rhône", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by domain", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, domain: "arts" });
      const response = await authenticatedGet("/v0/mission/search?domain=arts", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by openToMinors", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, openToMinors: true });
      const response = await authenticatedGet("/v0/mission/search?openToMinors=yes", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0].openToMinors).toBe("yes");
    });

    it("should filter by organizationRNA", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, organizationRNA: "XXX" });
      const response = await authenticatedGet("/v0/mission/search?organizationRNA=XXX", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by organizationStatusJuridique", async () => {
      await createTestMission({ organizationClientId: "org-7", publisherId: publisher.publishers[0].publisherId, organizationStatusJuridique: "Fondation" });
      const response = await authenticatedGet("/v0/mission/search?organizationStatusJuridique=Fondation", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by publisher", async () => {
      const response = await authenticatedGet(`/v0/mission/search?publisher=${mission2.publisherId}`, apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0]._id).toBe(mission2.id);
    });

    it("should filter by remote", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, remote: "full" });
      const response = await authenticatedGet("/v0/mission/search?remote=full", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by reducedMobilityAccessible", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, reducedMobilityAccessible: false });
      const response = await authenticatedGet("/v0/mission/search?reducedMobilityAccessible=no", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by startAt (gt)", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, startAt: new Date("2028-01-01") });
      const response = await authenticatedGet("/v0/mission/search?startAt=gt:2027-12-31", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it("should filter by type", async () => {
      await createTestMission({ publisherId: publisher.publishers[0].publisherId, type: "volontariat_service_civique" });
      const response = await authenticatedGet(`/v0/mission/search?type=${"volontariat_service_civique"}`, apiKey);
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
      const response = await authenticatedGet(`/v0/mission/${mission1._id}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(typeof response.body.data === "object").toBe(true);
      expect(response.body.data._id).toBe(mission1._id?.toString());

      validateMissionStructure(response.body.data);
    });

    it("should return an accepted mission within publisher diffusion scope", async () => {
      const owner = await createTestPublisher({ name: "Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Detail Diffuseur",
        publishers: [{ publisherId: owner.id }],
      });
      const mission = await createTestMission({
        publisherId: owner.id,
        title: "Scoped detail mission",
        statusCode: "ACCEPTED",
      });

      const response = await authenticatedGet(`/v0/mission/${mission.id}`, diffuseur.apikey!);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data._id).toBe(mission.id);
    });

    it("should keep list and detail aligned after a root removal until the next snapshot rebuild", async () => {
      const owner = await createTestPublisher({ name: "Stale Detail Owner" });
      const remainingOwner = await createTestPublisher({ name: "Remaining Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Stale Detail Diffuseur",
        publishers: [{ publisherId: owner.id }, { publisherId: remainingOwner.id }],
      });
      const mission = await createTestMission({
        publisherId: owner.id,
        title: "Mission kept in stale snapshot",
        statusCode: "ACCEPTED",
      });

      await new MissionDiffusionRebuildHandler().handle({});
      const [removedRoot] = await publisherDiffusionRuleService.findRules({
        publisherId: diffuseur.id,
        combinedWithId: null,
        field: "publisherId",
        value: owner.id,
      });
      await publisherDiffusionRuleService.deleteRule(removedRoot.id);

      const staleSnapshotApp = createTestApp();
      const listResponse = await request(staleSnapshotApp).get("/v0/mission").set("x-api-key", diffuseur.apikey!).expect(200);
      const searchResponse = await request(staleSnapshotApp).get("/v0/mission/search").set("x-api-key", diffuseur.apikey!).expect(200);
      const detailResponse = await request(staleSnapshotApp).get(`/v0/mission/${mission.id}`).set("x-api-key", diffuseur.apikey!).expect(200);
      const browseDetailResponse = await request(staleSnapshotApp).get(`/missions/browse/${mission.id}`).set("x-api-key", diffuseur.apikey!).expect(200);

      expect(listResponse.body.data.map((item: MissionRecord) => item._id)).toContain(mission.id);
      expect(searchResponse.body.hits.map((item: MissionRecord) => item._id)).toContain(mission.id);
      expect(detailResponse.body.data._id).toBe(mission.id);
      expect(browseDetailResponse.body.data.id).toBe(mission.id);
    });

    it("should keep a materialized exclusion until the next snapshot rebuild", async () => {
      const owner = await createTestPublisher({ name: "Stale Exclusion Owner" });
      const diffuseur = await createTestPublisher({
        name: "Stale Exclusion Diffuseur",
        publishers: [{ publisherId: owner.id }],
      });
      const mission = await createTestMission({
        organizationClientId: `stale-exclusion-${randomUUID()}`,
        publisherId: owner.id,
        title: "Mission excluded from stale snapshot",
        statusCode: "ACCEPTED",
      });
      const exclusion = await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur.id,
        annonceurPublisherId: owner.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: mission.organizationClientId!,
      });

      await new MissionDiffusionRebuildHandler().handle({});
      await publisherDiffusionRuleService.deleteRule(exclusion.id);

      const staleSnapshotApp = createTestApp();
      const listResponse = await request(staleSnapshotApp).get("/v0/mission").set("x-api-key", diffuseur.apikey!).expect(200);
      const detailResponse = await request(staleSnapshotApp).get(`/v0/mission/${mission.id}`).set("x-api-key", diffuseur.apikey!).expect(404);

      expect(listResponse.body.data.map((item: MissionRecord) => item._id)).not.toContain(mission.id);
      expect(detailResponse.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for a mission outside publisher diffusion scope", async () => {
      const allowedOwner = await createTestPublisher({ name: "Allowed Detail Owner" });
      const outsideOwner = await createTestPublisher({ name: "Outside Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Restricted Detail Diffuseur",
        publishers: [{ publisherId: allowedOwner.id }],
      });
      const mission = await createTestMission({
        publisherId: outsideOwner.id,
        title: "Outside detail mission",
        statusCode: "ACCEPTED",
      });

      const response = await authenticatedGet(`/v0/mission/${mission.id}`, diffuseur.apikey!);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for a mission excluded by a child diffusion rule", async () => {
      const owner = await createTestPublisher({ name: "Excluded Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Rule Restricted Detail Diffuseur",
        publishers: [{ publisherId: owner.id }],
      });
      const mission = await createTestMission({
        organizationClientId: `excluded-org-${randomUUID()}`,
        publisherId: owner.id,
        title: "Excluded detail mission",
        statusCode: "ACCEPTED",
      });
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur.id,
        annonceurPublisherId: owner.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: mission.organizationClientId!,
      });

      const response = await authenticatedGet(`/v0/mission/${mission.id}`, diffuseur.apikey!);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for non-accepted missions", async () => {
      const owner = await createTestPublisher({ name: "Moderation Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Moderation Detail Diffuseur",
        publishers: [{ publisherId: owner.id }],
      });
      const refusedMission = await createTestMission({
        publisherId: owner.id,
        title: "Refused detail mission",
        statusCode: "REFUSED",
      });
      const refusedResponse = await authenticatedGet(`/v0/mission/${refusedMission.id}`, diffuseur.apikey!);

      expect(refusedResponse.status).toBe(404);
      expect(refusedResponse.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for soft-deleted missions", async () => {
      const owner = await createTestPublisher({ name: "Deleted Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Deleted Detail Diffuseur",
        publishers: [{ publisherId: owner.id }],
      });
      const mission = await createTestMission({
        publisherId: owner.id,
        title: "Deleted detail mission",
        statusCode: "ACCEPTED",
        deleted: true,
      });

      const response = await authenticatedGet(`/v0/mission/${mission.id}`, diffuseur.apikey!);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return an own mission from the snapshot when publisher has no live partner", async () => {
      const noAccessPublisher = await createTestPublisher({ publishers: [] });
      const ownMission = await createTestMission({ publisherId: noAccessPublisher.id, title: "Own detail snapshot mission" });

      const response = await authenticatedGet(`/v0/mission/${ownMission.id}`, noAccessPublisher.apikey!);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data._id).toBe(ownMission.id);
    });

    it("should return 404 for a mission outside publisher diffusion scope through v2 mount", async () => {
      const allowedOwner = await createTestPublisher({ name: "Allowed V2 Detail Owner" });
      const outsideOwner = await createTestPublisher({ name: "Outside V2 Detail Owner" });
      const diffuseur = await createTestPublisher({
        name: "Restricted V2 Detail Diffuseur",
        publishers: [{ publisherId: allowedOwner.id }],
      });
      const mission = await createTestMission({
        publisherId: outsideOwner.id,
        title: "Outside v2 detail mission",
        statusCode: "ACCEPTED",
      });

      const response = await authenticatedGet(`/v2/mission/${mission.id}`, diffuseur.apikey!);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 for unknown id parameter", async () => {
      const id = randomUUID();
      const response = await authenticatedGet(`/v0/mission/${id}`, apiKey);
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("moderationAcceptedFor filter", () => {
    it("GET /v0/mission — should only return missions with ACCEPTED moderation status for a moderator publisher", async () => {
      const publisher1Id = publisher.publishers[0].publisherId;

      const moderatorPublisher = await createTestPublisher({
        name: "Moderator Publisher",
        moderator: true,
        publishers: [{ publisherId: publisher1Id }],
      });

      const acceptedMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Accepted mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: acceptedMission.id } },
        publisherId: moderatorPublisher.id,
        status: "ACCEPTED",
        comment: null,
        note: null,
        title: null,
      });

      const pendingMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Pending mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: pendingMission.id } },
        publisherId: moderatorPublisher.id,
        status: "PENDING",
        comment: null,
        note: null,
        title: null,
      });

      const refusedMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Refused mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: refusedMission.id } },
        publisherId: moderatorPublisher.id,
        status: "REFUSED",
        comment: "Not suitable",
        note: null,
        title: null,
      });

      const noModerationMission = await createTestMission({
        publisherId: publisher1Id,
        title: "No moderation for this publisher",
      });

      const response = await authenticatedGet("/v0/mission", moderatorPublisher.apikey!);

      expect(response.status).toBe(200);
      const ids = response.body.data.map((m: any) => m._id);
      expect(ids).toContain(acceptedMission.id);
      expect(ids).not.toContain(pendingMission.id);
      expect(ids).not.toContain(refusedMission.id);
      expect(ids).not.toContain(noModerationMission.id);
    });

    it("GET /v0/mission/search — should only return missions with ACCEPTED moderation status for a moderator publisher", async () => {
      const publisher1Id = publisher.publishers[0].publisherId;

      const moderatorPublisher = await createTestPublisher({
        name: "Moderator Publisher Search",
        moderator: true,
        publishers: [{ publisherId: publisher1Id }],
      });

      const acceptedMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Search accepted mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: acceptedMission.id } },
        publisherId: moderatorPublisher.id,
        status: "ACCEPTED",
        comment: null,
        note: null,
        title: null,
      });

      const pendingMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Search pending mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: pendingMission.id } },
        publisherId: moderatorPublisher.id,
        status: "PENDING",
        comment: null,
        note: null,
        title: null,
      });

      const response = await authenticatedGet("/v0/mission/search", moderatorPublisher.apikey!);

      expect(response.status).toBe(200);
      const ids = response.body.hits.map((m: any) => m._id);
      expect(ids).toContain(acceptedMission.id);
      expect(ids).not.toContain(pendingMission.id);
    });

    it("GET /v0/mission/:id — should only return missions with ACCEPTED moderation status for a moderator publisher", async () => {
      const publisher1Id = publisher.publishers[0].publisherId;

      const moderatorPublisher = await createTestPublisher({
        name: "Moderator Publisher Detail",
        moderator: true,
        publishers: [{ publisherId: publisher1Id }],
      });

      const acceptedMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Detail accepted mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: acceptedMission.id } },
        publisherId: moderatorPublisher.id,
        status: "ACCEPTED",
        comment: null,
        note: null,
        title: null,
      });

      const pendingMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Detail pending mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: pendingMission.id } },
        publisherId: moderatorPublisher.id,
        status: "PENDING",
        comment: null,
        note: null,
        title: null,
      });

      const refusedMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Detail refused mission",
      });
      await missionModerationStatusService.create({
        mission: { connect: { id: refusedMission.id } },
        publisherId: moderatorPublisher.id,
        status: "REFUSED",
        comment: null,
        note: null,
        title: null,
      });

      const noModerationMission = await createTestMission({
        publisherId: publisher1Id,
        title: "Detail no moderation mission",
      });

      const acceptedResponse = await authenticatedGet(`/v0/mission/${acceptedMission.id}`, moderatorPublisher.apikey!);
      const pendingResponse = await authenticatedGet(`/v0/mission/${pendingMission.id}`, moderatorPublisher.apikey!);
      const refusedResponse = await authenticatedGet(`/v0/mission/${refusedMission.id}`, moderatorPublisher.apikey!);
      const noModerationResponse = await authenticatedGet(`/v0/mission/${noModerationMission.id}`, moderatorPublisher.apikey!);

      expect(acceptedResponse.status).toBe(200);
      expect(acceptedResponse.body.data._id).toBe(acceptedMission.id);
      expect(pendingResponse.status).toBe(404);
      expect(refusedResponse.status).toBe(404);
      expect(noModerationResponse.status).toBe(404);
    });
  });

  describe("activities", () => {
    let multiActivityMission: MissionRecord;

    beforeEach(async () => {
      multiActivityMission = await createTestMission({
        organizationClientId: "org-multi-activity",
        publisherId: publisher.publishers[0].publisherId,
        title: "Mission multi-activités",
        activities: ["sport", "arts", "education"],
      });
    });

    it("GET /v0/mission — joins multiple activities sorted alphabetically", async () => {
      const response = await authenticatedGet(`/v0/mission?clientId=${multiActivityMission.clientId}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].activity).toBe("arts, education, sport");
    });

    it("GET /v0/mission/search — joins multiple activities sorted alphabetically", async () => {
      const response = await authenticatedGet(`/v0/mission/search?clientId=${multiActivityMission.clientId}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.hits[0].activity).toBe("arts, education, sport");
    });

    it("GET /v0/mission/:id — joins multiple activities sorted alphabetically", async () => {
      const response = await authenticatedGet(`/v0/mission/${multiActivityMission.id}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.data.activity).toBe("arts, education, sport");
    });

    it("mission with no activities returns activity null", async () => {
      const noActivityMission = await createTestMission({
        organizationClientId: "org-no-activity",
        publisherId: publisher.publishers[0].publisherId,
        title: "Mission sans activité",
        activities: [],
      });

      const response = await authenticatedGet(`/v0/mission/${noActivityMission.id}`, apiKey);

      expect(response.status).toBe(200);
      expect(response.body.data.activity).toBeNull();
    });

    it("search facets list each activity individually from a multi-activity mission", async () => {
      const response = await authenticatedGet(`/v0/mission/search?clientId=${multiActivityMission.clientId}`, apiKey);

      expect(response.status).toBe(200);
      const activityKeys = response.body.facets.activities.map((f: any) => f.key);
      expect(activityKeys).toContain("arts");
      expect(activityKeys).toContain("education");
      expect(activityKeys).toContain("sport");
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
  expect(mission).toHaveProperty("compensationAmount");
  expect(mission).toHaveProperty("compensationUnit");
  expect(mission).toHaveProperty("compensationType");
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
