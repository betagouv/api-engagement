import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestMission, createTestMissionEnrichment, createTestMissionScoring, createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

const app = createTestApp();

let apiKey: string;
let publisherId: string;

const withApiKey = <T extends { set(name: string, value: string): T }>(test: T) => test.set("x-api-key", apiKey);

const createUserScoring = async (): Promise<string> => {
  const response = await withApiKey(request(app).post("/user-scoring")).send({
    answers: [{ taxonomy: "domaine", value: "social_solidarite" }],
  });

  expect(response.status).toBe(201);
  return response.body.data.id;
};

// Utilisateur géolocalisé (Paris) : active la branche géo du moteur.
const createGeoUserScoring = async (): Promise<string> => {
  const response = await withApiKey(request(app).post("/user-scoring")).send({
    answers: [
      { taxonomy: "domaine", value: "social_solidarite" },
      { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } },
    ],
  });

  expect(response.status).toBe(201);
  return response.body.data.id;
};

// Mission remote=full sans adresse et sans recouvrement taxonomie avec l'utilisateur :
// elle n'entre ni dans les candidats taxonomie ni géo → cas ciblé par forced_remote_candidates.
const createRemoteFullMissionWithoutMatch = async () => {
  const mission = await createTestMission({
    publisherId,
    title: "Mission full remote",
    domain: "solidarite",
    remote: "full",
    addresses: [],
  });
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [{ taxonomyKey: "domaine", valueKey: "sport", score: 1 }],
  });
  return mission;
};

// Mission sur site à proximité sans adresse et sans recouvrement taxonomie avec l'utilisateur :
// elle suit la même injection que full, mais avec un score géo dédié plus faible.
const createRemoteLocalMissionWithoutMatch = async () => {
  const mission = await createTestMission({
    publisherId,
    title: "Mission locale sans adresse",
    domain: "solidarite",
    remote: "local",
    addresses: [],
  });
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [{ taxonomyKey: "domaine", valueKey: "sport", score: 1 }],
  });
  return mission;
};

const createOnsiteMissionWithoutMatch = async () => {
  const mission = await createTestMission({
    publisherId,
    title: "Mission sur site sans match taxonomie",
    domain: "solidarite",
    addresses: [
      {
        street: "1 rue de Test",
        postalCode: "75001",
        departmentCode: "75",
        departmentName: "Paris",
        city: "Paris",
        region: "Ile-de-France",
        country: "France",
        location: { lat: 48.8566, lon: 2.3522 },
        geolocStatus: "FOUND",
      },
    ],
  });
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [{ taxonomyKey: "domaine", valueKey: "sport", score: 1 }],
  });
  return mission;
};

// Mission remote=full AVEC une adresse géocodée proche : sous m3, la distance doit tout de même être
// ignorée (nullifiée) pour ne pas fausser l'affichage ni avgDistanceKmTop5.
const createRemoteFullMissionWithAddress = async () => {
  const mission = await createTestMission({
    publisherId,
    title: "Mission full remote géolocalisée",
    domain: "solidarite",
    remote: "full",
    addresses: [
      {
        street: "1 rue de Test",
        postalCode: "75001",
        departmentCode: "75",
        departmentName: "Paris",
        city: "Paris",
        region: "Ile-de-France",
        country: "France",
        location: { lat: 48.8566, lon: 2.3522 },
        geolocStatus: "FOUND",
      },
    ],
  });
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [{ taxonomyKey: "domaine", valueKey: "social_solidarite", score: 1 }],
  });
  return mission;
};

const createRankableMission = async () => {
  const mission = await createTestMission({
    publisherId,
    title: "Mission matchable",
    domain: "solidarite",
    addresses: [
      {
        street: "1 rue de Test",
        postalCode: "75001",
        departmentCode: "75",
        departmentName: "Paris",
        city: "Paris",
        region: "Ile-de-France",
        country: "France",
        location: { lat: 48.8566, lon: 2.3522 },
        geolocStatus: "FOUND",
      },
    ],
  });
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [{ taxonomyKey: "domaine", valueKey: "social_solidarite", score: 1 }],
  });
};

beforeEach(async () => {
  const publisher = await createTestPublisher({ name: "Mission Match API Test Publisher" });
  apiKey = publisher.apikey!;
  publisherId = publisher.id;
});

describe("GET /missions/match", () => {
  it("rejects an unknown engine version", async () => {
    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId: "00000000-0000-0000-0000-000000000000",
      engineVersion: "m99",
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("INVALID_QUERY");
  });

  it("returns the requested engine version", async () => {
    await createRankableMission();
    const userScoringId = await createUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m1",
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.engineVersion).toBe("m1");
    expect(response.body.data.items).toHaveLength(1);
  });

  it("returns the current engine version by default", async () => {
    await createRankableMission();
    const userScoringId = await createUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.engineVersion).toBe("m3");
    expect(response.body.data.items).toHaveLength(1);
  });

  it("ranks an eligible full-remote mission without taxonomy match nor address for a geolocated user (m3)", async () => {
    const mission = await createRemoteFullMissionWithoutMatch();
    const userScoringId = await createGeoUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m3",
    });

    expect(response.status).toBe(200);
    const item = response.body.data.items.find((entry: { mission: { id: string } }) => entry.mission.id === mission.id);
    expect(item).toBeDefined();
    expect(item.match.geoScore).toBe(0.9);
    expect(item.mission.location.distanceKm).toBeNull();
  });

  it("ranks an eligible local mission without taxonomy match nor address for a geolocated user (m3)", async () => {
    const mission = await createRemoteLocalMissionWithoutMatch();
    const userScoringId = await createGeoUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m3",
    });

    expect(response.status).toBe(200);
    const item = response.body.data.items.find((entry: { mission: { id: string } }) => entry.mission.id === mission.id);
    expect(item).toBeDefined();
    expect(item.match.geoScore).toBe(0.7);
    expect(item.mission.remote).toBe("local");
    expect(item.mission.location.distanceKm).toBeNull();
    expect(item.mission.location.city).toBeNull();
  });

  it("keeps the taxonomy score at zero for a nearby onsite mission without taxonomy match", async () => {
    const mission = await createOnsiteMissionWithoutMatch();
    const userScoringId = await createGeoUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m3",
    });

    expect(response.status).toBe(200);
    const item = response.body.data.items.find((entry: { mission: { id: string } }) => entry.mission.id === mission.id);
    expect(item).toBeDefined();
    expect(item.match.taxonomyScore).toBe(0);
    expect(item.match.geoScore).toBe(1);
  });

  it("does not surface the same full-remote mission under m2 (candidate pool gap it fixes)", async () => {
    const mission = await createRemoteFullMissionWithoutMatch();
    const userScoringId = await createGeoUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m2",
    });

    expect(response.status).toBe(200);
    const item = response.body.data.items.find((entry: { mission: { id: string } }) => entry.mission.id === mission.id);
    expect(item).toBeUndefined();
  });

  it("ignores the geocoded address of a full-remote mission under m3 (no distance leaked)", async () => {
    const mission = await createRemoteFullMissionWithAddress();
    const userScoringId = await createGeoUserScoring();

    const response = await withApiKey(request(app).get("/missions/match")).query({
      userScoringId,
      engineVersion: "m3",
    });

    expect(response.status).toBe(200);
    const item = response.body.data.items.find((entry: { mission: { id: string } }) => entry.mission.id === mission.id);
    expect(item).toBeDefined();
    expect(item.match.geoScore).toBe(0.9);
    expect(item.mission.location.distanceKm).toBeNull();
    expect(item.mission.location.closestLat).toBeNull();
    expect(item.mission.location.closestLon).toBeNull();
    expect(item.mission.location.addressId).toBeNull();
    // Le fallback city (mission.addresses[0].city) doit aussi être neutralisé pour une full-remote.
    expect(item.mission.location.city).toBeNull();
    expect(response.body.data.avgDistanceKmTop5).toBeNull();
  });
});
