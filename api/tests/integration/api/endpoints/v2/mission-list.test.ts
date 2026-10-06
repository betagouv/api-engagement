import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { missionService } from "@/services/mission";
import { createTestMission, createTestPublisher } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

describe("GET /v2/mission", () => {
  const app = createTestApp({ syncMissionDiffusion: true });
  let apiKey: string;
  let visibleIds: string[];

  beforeEach(async () => {
    const owner = await createTestPublisher();
    const diffuseur = await createTestPublisher({ publishers: [{ publisherId: owner.id }] });
    apiKey = diffuseur.apikey!;
    visibleIds = [];

    for (const [id, city] of [
      ["00000000-0000-0000-0000-000000000001", "Paris"],
      ["00000000-0000-0000-0000-000000000002", "Lyon"],
      ["00000000-0000-0000-0000-000000000003", "Paris"],
    ]) {
      const mission = await createTestMission({ id, publisherId: owner.id, city, openToMinors: true });
      visibleIds.push(mission.id);
    }
    await createTestMission({ publisherId: owner.id, deleted: true });
    await createTestMission({ publisherId: (await createTestPublisher()).id });
  });

  it("pagine sans offset, conserve le périmètre de diffusion et renvoie le format v2", async () => {
    const first = await request(app).get("/v2/mission?limit=2").set("x-api-key", apiKey).expect(200);
    expect(first.body.data.map((mission: { id: string }) => mission.id)).toEqual(visibleIds.slice(0, 2));
    expect(first.body.data[0].openToMinors).toBe(true);
    expect(first.body.data[0]).toHaveProperty("addresses");
    expect(first.body.data[0]).not.toHaveProperty("_id");
    expect(first.body.hasMore).toBe(true);
    expect(first.body.nextCursor).toBe(visibleIds[1]);
    expect(first.body.total).toBe(visibleIds.length);

    const second = await request(app).get(`/v2/mission?limit=2&cursor=${first.body.nextCursor}`).set("x-api-key", apiKey).expect(200);
    expect(second.body.data.map((mission: { id: string }) => mission.id)).toEqual(visibleIds.slice(2));
    expect(second.body.hasMore).toBe(false);
    expect(second.body.nextCursor).toBeNull();
    expect(second.body.total).toBe(visibleIds.length);
  });

  it("applique les filtres v0 au résultat et au total", async () => {
    const response = await request(app).get("/v2/mission?city=Paris&openToMinors=yes&limit=1").set("x-api-key", apiKey).expect(200);
    expect(response.body.total).toBe(2);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.hasMore).toBe(true);

    const second = await request(app)
      .get(`/v2/mission?city=Paris&openToMinors=yes&limit=1&cursor=${response.body.nextCursor}`)
      .set("x-api-key", apiKey)
      .expect(200);
    expect(second.body.total).toBe(2);
    expect(second.body.data[0].id).toBe(visibleIds[2]);
  });

  it("réutilise le total entre les pages d'un même parcours", async () => {
    const countMissions = vi.spyOn(missionService, "countMissions");

    const first = await request(app).get("/v2/mission?limit=1").set("x-api-key", apiKey).expect(200);
    await request(app).get(`/v2/mission?limit=2&cursor=${first.body.nextCursor}`).set("x-api-key", apiKey).expect(200);

    expect(countMissions).toHaveBeenCalledTimes(1);
    countMissions.mockRestore();
  });

  it("filtre les missions mises à jour après une date", async () => {
    const cutoff = new Date("2030-01-01T00:00:00.000Z");
    const recentMission = await createTestMission({ publisherId: (await createTestPublisher()).id, updatedAt: new Date("2031-01-01T00:00:00.000Z") });
    const diffuseur = await createTestPublisher({ publishers: [{ publisherId: recentMission.publisherId }] });

    const response = await request(app)
      .get(`/v2/mission?updatedAt=gt:${cutoff.toISOString()}`)
      .set("x-api-key", diffuseur.apikey!)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data.map((mission: { id: string }) => mission.id)).toEqual([recentMission.id]);
  });

  it("refuse un filtre updatedAt invalide", async () => {
    await request(app).get("/v2/mission?updatedAt=2026-09-01").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission?updatedAt=gt:not-a-date").set("x-api-key", apiKey).expect(400);
  });

  it("refuse l'ancienne pagination et les limites invalides", async () => {
    await request(app).get("/v2/mission?skip=1000").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission?includeTotal=true").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission?limit=0").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission").expect(401);
  });
});
