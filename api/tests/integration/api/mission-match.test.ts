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
      engineVersion: "m3",
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
    expect(response.body.data.engineVersion).toBe("m2");
    expect(response.body.data.items).toHaveLength(1);
  });
});
