import { describe, expect, it } from "vitest";

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { buildRankingQueryForInput } from "@/services/matching-engine/ranking-query";
import type { RankMissionsByUserScoringInput } from "@/services/matching-engine/types";

import { createTestMission, createTestMissionEnrichment, createTestMissionScoring, createTestPublisher } from "../fixtures";

const rank = (input: RankMissionsByUserScoringInput) => matchingEngineService.rankMissionsByUserScoring({ version: "m6", persistMatchingResult: false, ...input });
const comparable = ({ tookMs: _duration, ...result }: Awaited<ReturnType<typeof rank>>) => result;
const latitudeAtKm = (distanceKm: number) => (distanceKm / 6371) * (180 / Math.PI);

const createUser = (geo: { lat: number; lon: number; radiusKm: number } | null = { lat: 0, lon: 0, radiusKm: 20 }) =>
  prisma.userScoring.create({
    data: {
      values: {
        create: [
          { taxonomyKey: "domaine", valueKey: "social_solidarite", score: 1 },
          { taxonomyKey: "tranche_age", valueKey: "entre_18_25_ans", score: 1 },
        ],
      },
      ...(geo === null ? {} : { geo: { create: geo } }),
    },
  });

const createMission = async (
  coordinates: Array<{ lat: number | null; lon: number | null }>,
  options: { remote?: "no" | "full" | "local"; age?: string; noMatch?: boolean; publisherId?: string } = {}
) => {
  const mission = await createTestMission({ addresses: [], remote: options.remote, publisherId: options.publisherId });
  if (coordinates.length > 0) {
    await prisma.missionAddress.createMany({
      data: coordinates.map((position, index) => ({ missionId: mission.id, addressHash: `address-${index}`, locationLat: position.lat, locationLon: position.lon })),
    });
  }
  const enrichment = await createTestMissionEnrichment({ missionId: mission.id });
  const scoring = await createTestMissionScoring({
    missionId: mission.id,
    missionEnrichmentId: enrichment.id,
    values: [
      { taxonomyKey: "domaine", valueKey: options.noMatch ? "sport" : "social_solidarite", score: 1 },
      ...(options.age ? [{ taxonomyKey: "tranche_age" as const, valueKey: options.age, score: 0 }] : []),
    ],
  });
  return { mission, scoring };
};

type PlanNode = { "Subplan Name"?: string; "Actual Rows": number; Plans?: PlanNode[] };
const correspondenceCount = (node: PlanNode): number | undefined =>
  node["Subplan Name"] === "CTE matching_mission_values" ? node["Actual Rows"] : node.Plans?.map(correspondenceCount).find((count) => count !== undefined);

describe("préfiltre géographique avant les correspondances", () => {
  it("filtre avant le GROUP BY, respecte les gates et conserve les exceptions", async () => {
    const user = await createUser();
    const publisher = await createTestPublisher();
    const near = await createMission([{ lat: latitudeAtKm(10), lon: 0 }]);
    const inside = await createMission([{ lat: latitudeAtKm(119.999), lon: 0 }]);
    const far = await createMission([{ lat: latitudeAtKm(120.001), lon: 0 }]);
    const corner = await createMission([{ lat: latitudeAtKm(100), lon: latitudeAtKm(100) }]);
    const full = await createMission([{ lat: 30, lon: 30 }], { remote: "full" });
    const local = await createMission([{ lat: 30, lon: 30 }], { remote: "local" });
    const unknown = await createMission([]);
    const partial = await createMission([{ lat: 0, lon: null }]);
    const multi = await createMission([
      { lat: 30, lon: 30 },
      { lat: latitudeAtKm(5), lon: 0 },
      { lat: latitudeAtKm(15), lon: 0 },
    ]);
    const wrongAge = await createMission([{ lat: 0, lon: 0 }], { age: "moins_18_ans", remote: "full" });
    const outsideDiffusion = await createMission([{ lat: 0, lon: 0 }]);
    const deleted = await createMission([{ lat: 0, lon: 0 }]);
    await prisma.mission.update({ where: { id: deleted.mission.id }, data: { deletedAt: new Date() } });
    const fixtures = [near, inside, far, corner, full, local, unknown, partial, multi, wrongAge, deleted];
    await prisma.missionDiffusion.createMany({ data: fixtures.map(({ mission }) => ({ missionId: mission.id, distributionPublisherId: publisher.id })) });

    const input = { userScoringId: user.id, publisherId: publisher.id };
    const expected = [near, inside, full, local, unknown, partial, multi].map(({ mission }) => mission.id);
    for (const version of ["m1", "m3", "m6"] as const) {
      const result = await rank({ ...input, version });
      expect(result.items.map((item) => item.missionId).sort()).toEqual([...expected].sort());
      expect(result.total).toBe(expected.length);
      expect(result.items.find((item) => item.missionId === multi.mission.id)?.distanceKm).toBeCloseTo(5, 6);
      const page = await rank({ ...input, version, limit: 2, offset: 1 });
      expect(page.items).toEqual(result.items.slice(1, 3));
    }
    expect(expected).not.toContain(outsideDiffusion.mission.id);
    const original = await rank({ ...input, useGeographicPrefilter: false });
    expect(original.items.some((item) => item.missionId === far.mission.id)).toBe(true);
    expect(original.items.some((item) => item.missionId === corner.mission.id)).toBe(true);

    const query = buildRankingQueryForInput({ ...input, version: "m6" });
    const [plan] = await prisma.$queryRaw<Array<{ "QUERY PLAN": Array<{ Plan: PlanNode }> }>>(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON) ${query}`);
    expect(correspondenceCount(plan["QUERY PLAN"][0].Plan)).toBe(expected.length);

    // Une modification de localisation est visible dès le classement suivant.
    await prisma.missionAddress.updateMany({ where: { missionId: far.mission.id }, data: { locationLat: 0, locationLon: 0 } });
    expect((await rank(input)).items.some((item) => item.missionId === far.mission.id)).toBe(true);
  }, 15000);

  it("conserve les résultats globaux sans localisation utilisateur", async () => {
    const user = await createUser(null);
    await createMission([{ lat: 50, lon: 50 }]);
    await createMission([]);
    for (const version of ["m1", "m6"] as const) {
      const input = { userScoringId: user.id, version };
      expect(comparable(await rank(input))).toEqual(comparable(await rank({ ...input, useGeographicPrefilter: false })));
    }
  });

  it("respecte un rayon utilisateur supérieur à 120 km et utilise 120 km pour un rayon nul", async () => {
    const user = await createUser({ lat: 0, lon: 0, radiusKm: 200 });
    const near = await createMission([{ lat: latitudeAtKm(150), lon: 0 }]);
    await createMission([{ lat: latitudeAtKm(201), lon: 0 }]);
    const input = { userScoringId: user.id };
    expect((await rank(input)).items.map((item) => item.missionId)).toEqual([near.mission.id]);
    await prisma.userScoringGeo.update({ where: { userScoringId: user.id }, data: { radiusKm: 0 } });
    expect((await rank(input)).items).toEqual([]);
  });

  it("ne réintroduit pas une mission lointaine par le fallback géographique", async () => {
    const user = await createUser();
    const far = await createMission([{ lat: 30, lon: 30 }], { noMatch: true });
    const input = { userScoringId: user.id };
    expect((await rank({ ...input, useGeographicPrefilter: false })).items.map((item) => item.missionId)).toEqual([far.mission.id]);
    expect((await rank(input)).items).toEqual([]);
    const remote = await createMission([{ lat: 30, lon: 30 }], { remote: "full", noMatch: true });
    expect((await rank(input)).items.map((item) => item.missionId)).toEqual([remote.mission.id]);
  });

  it.each([
    { user: { lat: 0, lon: 179.7 }, mission: { lat: 0, lon: -179.7 } },
    { user: { lat: 0, lon: -179.7 }, mission: { lat: 0, lon: 179.7 } },
    { user: { lat: 89.8, lon: 0 }, mission: { lat: 89.8, lon: 180 } },
  ])("conserve une mission proche au passage des longitudes ou près d'un pôle ($user)", async ({ user: position, mission: coordinates }) => {
    const user = await createUser({ ...position, radiusKm: 20 });
    const mission = await createMission([coordinates]);
    const result = await rank({ userScoringId: user.id });
    expect(result.items.map((item) => item.missionId)).toEqual([mission.mission.id]);
    expect(result.items[0].distanceKm).toBeLessThan(120);
  });
});
