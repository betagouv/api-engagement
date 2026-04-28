import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { missionIndexService } from "@/services/mission-index";
import { createTestMission, createTestMissionEnrichment, createTestMissionScoring, createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

const indexMission = async (missionId: string) => {
  const enrichment = await createTestMissionEnrichment({ missionId });
  await createTestMissionScoring({ missionId, missionEnrichmentId: enrichment.id });
  await missionIndexService.upsert(missionId);
};

describe("GET /missions/browse", () => {
  let publisher: Awaited<ReturnType<typeof createTestPublisher>>;

  beforeEach(async () => {
    publisher = await createTestPublisher();
  });

  it("retourne 200 avec des résultats vides quand aucune mission n'est indexée", async () => {
    const res = await request(app).get("/missions/browse");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.facets).toBeDefined();
  });

  it("retourne 400 sur des params invalides", async () => {
    const res = await request(app).get("/missions/browse?pageSize=9999");
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("retourne les missions indexées sans filtre", async () => {
    const mission = await createTestMission({ publisherId: publisher.id });
    await indexMission(mission.id);

    const res = await request(app).get("/missions/browse");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(mission.id);
  });

  it("filtre par publisherId", async () => {
    const otherPublisher = await createTestPublisher();
    const mission1 = await createTestMission({ publisherId: publisher.id });
    const mission2 = await createTestMission({ publisherId: otherPublisher.id });
    await indexMission(mission1.id);
    await indexMission(mission2.id);

    const res = await request(app).get(`/missions/browse?publisherId=${publisher.id}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(mission1.id);
  });

  it("filtre par departmentCode", async () => {
    const missionParis = await createTestMission({
      publisherId: publisher.id,
      addresses: [
        { street: "1 rue de la Paix", city: "Paris", departmentCode: "75", departmentName: "Paris", postalCode: "75001", country: "France", geolocStatus: "ENRICHED_BY_PUBLISHER" },
      ],
    });
    const missionLyon = await createTestMission({
      publisherId: publisher.id,
      addresses: [
        {
          street: "1 rue de la République",
          city: "Lyon",
          departmentCode: "69",
          departmentName: "Rhône",
          postalCode: "69001",
          country: "France",
          geolocStatus: "ENRICHED_BY_PUBLISHER",
        },
      ],
    });
    await indexMission(missionParis.id);
    await indexMission(missionLyon.id);

    const res = await request(app).get("/missions/browse?departmentCode=75");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(missionParis.id);
  });

  it("retourne les facets avec les comptes corrects", async () => {
    const missionParis = await createTestMission({
      publisherId: publisher.id,
      addresses: [
        { street: "1 rue test", city: "Paris", departmentCode: "75", departmentName: "Paris", postalCode: "75001", country: "France", geolocStatus: "ENRICHED_BY_PUBLISHER" },
      ],
    });
    const missionLyon = await createTestMission({
      publisherId: publisher.id,
      addresses: [
        { street: "2 rue test", city: "Lyon", departmentCode: "69", departmentName: "Rhône", postalCode: "69001", country: "France", geolocStatus: "ENRICHED_BY_PUBLISHER" },
      ],
    });
    await indexMission(missionParis.id);
    await indexMission(missionLyon.id);

    const res = await request(app).get("/missions/browse");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);

    const deptFacets = res.body.facets.departmentCodes as Array<{ key: string; count: number }>;
    expect(deptFacets).toContainEqual({ key: "75", count: 1 });
    expect(deptFacets).toContainEqual({ key: "69", count: 1 });
  });

  it("ne retourne pas les missions soft-deleted", async () => {
    const mission = await createTestMission({ publisherId: publisher.id });
    await indexMission(mission.id);
    await missionIndexService.delete(mission.id);

    const res = await request(app).get("/missions/browse");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });

  it("pagine correctement", async () => {
    for (let i = 0; i < 5; i++) {
      const m = await createTestMission({ publisherId: publisher.id });
      await indexMission(m.id);
    }

    const page1 = await request(app).get("/missions/browse?page=1&pageSize=3");
    expect(page1.status).toBe(200);
    expect(page1.body.total).toBe(5);
    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.page).toBe(1);
    expect(page1.body.pageSize).toBe(3);

    const page2 = await request(app).get("/missions/browse?page=2&pageSize=3");
    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.page).toBe(2);
  });

  it("filtre par plusieurs departmentCodes (tableau)", async () => {
    const depts = ["75", "69", "13"];
    const createdMissions: Awaited<ReturnType<typeof createTestMission>>[] = [];
    for (let i = 0; i < depts.length; i++) {
      const m = await createTestMission({
        publisherId: publisher.id,
        addresses: [
          {
            street: `${i} rue test`,
            city: "Ville",
            departmentCode: depts[i],
            departmentName: depts[i],
            postalCode: `${depts[i]}000`,
            country: "France",
            geolocStatus: "ENRICHED_BY_PUBLISHER",
          },
        ],
      });
      createdMissions.push(m);
      await indexMission(m.id);
    }

    const res = await request(app).get("/missions/browse?departmentCode=75&departmentCode=69");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const ids = res.body.data.map((d: { id: string }) => d.id);
    expect(ids).toContain(createdMissions[0].id);
    expect(ids).toContain(createdMissions[1].id);
    expect(ids).not.toContain(createdMissions[2].id);
  });
});
