import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

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
    expect(first.body).not.toHaveProperty("total");

    const second = await request(app).get(`/v2/mission?limit=2&cursor=${first.body.nextCursor}`).set("x-api-key", apiKey).expect(200);
    expect(second.body.data.map((mission: { id: string }) => mission.id)).toEqual(visibleIds.slice(2));
    expect(second.body.hasMore).toBe(false);
    expect(second.body.nextCursor).toBeNull();
  });

  it("applique les filtres v0 sans calculer de total", async () => {
    const response = await request(app).get("/v2/mission?city=Paris&openToMinors=yes&limit=1").set("x-api-key", apiKey).expect(200);
    expect(response.body).not.toHaveProperty("total");
    expect(response.body.data).toHaveLength(1);
    expect(response.body.hasMore).toBe(true);

    const second = await request(app)
      .get(`/v2/mission?city=Paris&openToMinors=yes&limit=1&cursor=${response.body.nextCursor}`)
      .set("x-api-key", apiKey)
      .expect(200);
    expect(second.body).not.toHaveProperty("total");
    expect(second.body.data[0].id).toBe(visibleIds[2]);
  });

  it("refuse l'ancienne pagination et les limites excessives", async () => {
    await request(app).get("/v2/mission?skip=1000").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission?includeTotal=true").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission?limit=10000").set("x-api-key", apiKey).expect(400);
    await request(app).get("/v2/mission").expect(401);
  });
});
