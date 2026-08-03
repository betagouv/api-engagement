import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission-matching-result", () => ({
  missionMatchingResultRepository: {
    createForUserScoringVersion: vi.fn(),
  },
}));

import { prisma } from "@/db/postgres";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { matchingEngineService } from "@/services/matching-engine";
import { CURRENT_MATCHING_ENGINE_VERSION } from "@/services/matching-engine/config";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";

const prismaMock = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};

const missionMatchingResultRepositoryMock = missionMatchingResultRepository as unknown as {
  createForUserScoringVersion: ReturnType<typeof vi.fn>;
};

const getSqlText = (query: unknown): string => {
  if (typeof query === "object" && query !== null && "sql" in query && typeof query.sql === "string") {
    return query.sql;
  }

  if (typeof query === "object" && query !== null && "text" in query && typeof query.text === "string") {
    return query.text;
  }

  if (typeof query === "object" && query !== null && "strings" in query && Array.isArray(query.strings)) {
    return query.strings.join("");
  }

  return String(query);
};

const getSqlValues = (query: unknown): unknown[] => {
  if (typeof query === "object" && query !== null && "values" in query && Array.isArray(query.values)) {
    return query.values;
  }

  return [];
};

describe("matchingEngineService", () => {
  beforeEach(() => {
    prismaMock.$queryRaw.mockReset();
    missionMatchingResultRepositoryMock.createForUserScoringVersion.mockReset();
  });

  describe("rankMissionsByUserScoring", () => {
    it("throws when the user scoring does not exist", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        matchingEngineService.rankMissionsByUserScoring({
          userScoringId: "user-scoring-missing",
        })
      ).rejects.toThrow("[matchingEngineService] user_scoring 'user-scoring-missing' not found.");

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns ranked missions with clamped scores and indexed taxonomy scores", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-1",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-1",
            mission_scoring_id: "mission-scoring-1",
            total_score: 1.4,
            taxonomy_score: -0.2,
            geo_score: 0.71234567,
            distance_km: 12.345,
            closest_address_id: "mission-address-1",
          },
          {
            mission_id: "mission-2",
            mission_scoring_id: "mission-scoring-2",
            total_score: 0.4567891,
            taxonomy_score: 0.8765432,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-1",
            taxonomy_key: "domaine",
            taxonomy_score: 1.8,
          },
          {
            mission_scoring_id: "mission-scoring-1",
            taxonomy_key: "unknown_taxonomy",
            taxonomy_score: 0.9,
          },
          {
            mission_scoring_id: "mission-scoring-2",
            taxonomy_key: "format_activite",
            taxonomy_score: 0.3333333,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-1",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-1",
        limit: 1,
      });

      expect(result.version).toBe(CURRENT_MATCHING_ENGINE_VERSION);
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      const rankingValues = getSqlValues(prismaMock.$queryRaw.mock.calls[1][0]);
      const taxonomyScoresValues = getSqlValues(prismaMock.$queryRaw.mock.calls[2][0]);
      expect(rankingSql).toContain('ma."id" AS "closest_address_id"');
      expect(rankingSql).toContain("JOIN taxonomy_weights tw");
      expect(rankingValues).toContain("domaine");
      expect(rankingValues).toContain(CURRENT_PROMPT_VERSION);
      expect(rankingSql).toContain('me."prompt_version" =');
      expect(rankingValues).toContain("tranche_age");
      expect(taxonomyScoresValues).toContain("domaine");
      expect(taxonomyScoresValues).not.toContain("tranche_age");
      expect(rankingValues).not.toContain("rythme");
      expect(rankingSql).toContain('ORDER BY "distance_km" ASC, ma."created_at" ASC, ma."id" ASC');
      expect(rankingSql).toContain('ems."mission_id",\n      msv."mission_scoring_id"');
      expect(rankingSql).toContain('MAX(cmr."weighted_sum") AS "weighted_sum"');
      expect(rankingSql).not.toContain('LEFT JOIN taxonomy_scores ts\n      ON ts."mission_scoring_id" = cm."mission_scoring_id"');
      expect(result.items).toEqual([
        {
          missionId: "mission-1",
          missionScoringId: "mission-scoring-1",
          missionAddressId: "mission-address-1",
          totalScore: 1,
          taxonomyScore: 0,
          geoScore: 0.712346,
          distanceKm: 12.345,
          closestLat: null,
          closestLon: null,
          closestCity: null,
          closestAddress: null,
          taxonomyScores: {
            domaine: 1,
          },
        },
      ]);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-1",
        matchingEngineVersion: CURRENT_MATCHING_ENGINE_VERSION,
        results: [
          {
            missionScoringId: "mission-scoring-1",
            missionAddressId: "mission-address-1",
            taxonomyScores: {
              domaine: 1,
            },
          },
          {
            missionScoringId: "mission-scoring-2",
            missionAddressId: null,
            taxonomyScores: {},
          },
        ],
      });
      expect(result.tookMs).toBeGreaterThanOrEqual(0);
    });

    it("joint directement le snapshot complet pour le diffuseur", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "user-scoring-table-filter" }]).mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-table-filter",
      });

      await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-table-filter",
        publisherId: "publisher-diffuseur-1",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(rankingSql).toContain('JOIN "mission_diffusion" md');
      expect(rankingSql).toContain('md."mission_id" = m."id"');
      expect(rankingSql).toContain('md."distribution_publisher_id" =');
      expect(rankingSql).not.toContain('FROM "mission_diffusion" md\n      WHERE');
    });

    it("does not query taxonomy scores when no mission is ranked", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-empty",
          },
        ])
        .mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-empty",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-empty",
      });

      expect(result.version).toBe(CURRENT_MATCHING_ENGINE_VERSION);
      expect(result.items).toEqual([]);
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-empty",
        matchingEngineVersion: CURRENT_MATCHING_ENGINE_VERSION,
        results: [],
      });
    });

    it("uses the requested m1 version config and persists the m1 snapshot", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m1",
          },
        ])
        .mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m1",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m1",
        version: "m1",
        taxonomyWeight: 0.11,
      });

      const rankingValues = getSqlValues(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(result.version).toBe("m1");
      expect(rankingValues).toContain(0.7);
      expect(rankingValues).not.toContain(0.3);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-m1",
        matchingEngineVersion: "m1",
        results: [],
      });
    });

    it("weights the new taxonomies under m4 while still ranking missions scored only on old taxonomies", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m4",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-old-only",
            mission_scoring_id: "mission-scoring-old-only",
            total_score: 0.6,
            taxonomy_score: 0.6,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-old-only",
            taxonomy_key: "domaine",
            taxonomy_score: 0.6,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m4",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m4",
        version: "m4",
      });

      const rankingValues = getSqlValues(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(result.version).toBe("m4");
      // m4 pondère les nouvelles taxonomies du parcours de recommandation…
      for (const taxonomy of ["domaine_engagement", "rythme", "activite", "motivation_recherche"]) {
        expect(rankingValues).toContain(taxonomy);
      }
      // …tout en conservant les anciennes pour la rétro-compatibilité.
      expect(rankingValues).toContain("domaine");
      // Une mission scorée uniquement sur les anciennes taxonomies reste classée (pas d'exclusion).
      expect(result.items).toHaveLength(1);
      expect(result.items[0].missionId).toBe("mission-old-only");
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-m4",
        matchingEngineVersion: "m4",
        results: [
          {
            missionScoringId: "mission-scoring-old-only",
            missionAddressId: null,
            taxonomyScores: {
              domaine: 0.6,
            },
          },
        ],
      });
    });

    it("returns only missions that remain after gate exclusion", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-gate-filtered",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-eligible",
            mission_scoring_id: "mission-scoring-eligible",
            total_score: 0.8,
            taxonomy_score: 0.8,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-eligible",
            taxonomy_key: "domaine",
            taxonomy_score: 0.8,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-gate",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-gate-filtered",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      expect(rankingSql).toContain("user_gate_values");
      expect(rankingSql).toContain("matched_gate_taxonomies");
      expect(rankingSql).not.toContain('AND usv."taxonomy_key" NOT IN');
      expect(result.items).toEqual([
        {
          missionId: "mission-eligible",
          missionScoringId: "mission-scoring-eligible",
          missionAddressId: null,
          totalScore: 0.8,
          taxonomyScore: 0.8,
          geoScore: null,
          distanceKm: null,
          closestLat: null,
          closestLon: null,
          closestCity: null,
          closestAddress: null,
          taxonomyScores: {
            domaine: 0.8,
          },
        },
      ]);
    });

    it("keeps excluded missions out of the final payload and ignores their taxonomy rows", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-gate-taxonomies",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-1",
            mission_scoring_id: "mission-scoring-1",
            total_score: 0.7,
            taxonomy_score: 0.7,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-1",
            taxonomy_key: "domaine",
            taxonomy_score: 0.7,
          },
          {
            mission_scoring_id: "mission-scoring-excluded",
            taxonomy_key: "domaine",
            taxonomy_score: 0.2,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-gate-taxonomies",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-gate-taxonomies",
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result.items).toEqual([
        {
          missionId: "mission-1",
          missionScoringId: "mission-scoring-1",
          missionAddressId: null,
          totalScore: 0.7,
          taxonomyScore: 0.7,
          geoScore: null,
          distanceKm: null,
          closestLat: null,
          closestLon: null,
          closestCity: null,
          closestAddress: null,
          taxonomyScores: {
            domaine: 0.7,
          },
        },
      ]);
    });

    it("uses bounded OR taxonomy scoring with multi-value bonus", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-or-taxonomy",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-1",
            mission_scoring_id: "mission-scoring-1",
            total_score: 0.866667,
            taxonomy_score: 0.866667,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-1",
            taxonomy_key: "domaine",
            taxonomy_score: 0.866667,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-or-taxonomy",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-or-taxonomy",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      const taxonomyScoresSql = getSqlText(prismaMock.$queryRaw.mock.calls[2][0]);

      expect(result.items[0].taxonomyScores.domaine).toBe(0.866667);
      expect(rankingSql).toContain('COALESCE(SUM(COALESCE(dw."taxonomy_weight", 1.0)), 0) AS "taxonomy_total"');
      expect(rankingSql).not.toContain('SUM(udt."taxonomy_total" * COALESCE(dw."taxonomy_weight", 1.0))');
      expect(rankingSql).toContain('LEAST(mv."taxonomy_sum" / NULLIF(udt."taxonomy_total", 0), 1.0)');
      expect(taxonomyScoresSql).toContain('LEAST(mv."taxonomy_sum" / udt."taxonomy_total", 1.0)');
    });

    it("does not persist a snapshot when the caller requests an offset page", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-page-2",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-2",
            mission_scoring_id: "mission-scoring-2",
            total_score: 0.6,
            taxonomy_score: 0.6,
            geo_score: null,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-2",
            taxonomy_key: "domaine",
            taxonomy_score: 0.6,
          },
        ]);

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-page-2",
        limit: 10,
        offset: 10,
      });

      expect(result.items).toEqual([
        {
          missionId: "mission-2",
          missionScoringId: "mission-scoring-2",
          missionAddressId: null,
          totalScore: 0.6,
          taxonomyScore: 0.6,
          geoScore: null,
          distanceKm: null,
          closestLat: null,
          closestLon: null,
          closestCity: null,
          closestAddress: null,
          taxonomyScores: {
            domaine: 0.6,
          },
        },
      ]);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).not.toHaveBeenCalled();
    });

    it("injects the forced remote geo score branches and values for the m3 version", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m3",
          },
        ])
        .mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m3",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m3",
        version: "m3",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      const rankingValues = getSqlValues(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(result.version).toBe("m3");
      expect(rankingSql).toContain("WHEN m.\"remote\"::text = 'full' THEN CAST(");
      expect(rankingSql).toContain("WHEN m.\"remote\"::text = 'local' THEN CAST(");
      expect(rankingSql).toContain('JOIN "mission" m');
      expect(rankingSql).toContain("forced_remote_candidates AS (");
      expect(rankingSql).toContain("unscored_remote_missions AS (");
      expect(rankingSql).toContain("EXCEPT");
      expect(rankingSql).toContain("m.\"remote\"::text IN ('full', 'local')");
      expect(rankingSql).toContain("FROM forced_remote_candidates rfc");
      expect(rankingSql).toContain("WHEN m.\"remote\"::text IN ('full', 'local') THEN NULL ELSE gs.\"distance_km\" END");
      expect(rankingValues).toContain(0.9);
      expect(rankingValues).toContain(0.95);
    });

    it("does not inject the remote=full branch for the m2 version (non-regression)", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m2",
          },
        ])
        .mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m2",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m2",
        version: "m2",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(result.version).toBe("m2");
      expect(rankingSql).not.toContain('m."remote"::text');
      expect(rankingSql).not.toContain("forced_remote_candidates");
    });

    it("uses the mobility radius as a linear geo score cutoff in m5", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "user-scoring-m5" }]).mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m5",
      });

      await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m5",
        version: "m5",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(rankingSql).toContain('WHEN gs."distance_km" >= ug."radius_km" THEN 0.0');
      expect(rankingSql).toContain('1.0 - (gs."distance_km" / ug."radius_km")');
      expect(rankingSql).toContain('WHEN NULLIF(ug."radius_km", 0) IS NULL THEN');
    });

    it("keeps the legacy geo decay formula in m4", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "user-scoring-m4" }]).mockResolvedValueOnce([]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m4",
      });

      await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m4",
        version: "m4",
      });

      const rankingSql = getSqlText(prismaMock.$queryRaw.mock.calls[1][0]);
      expect(rankingSql).toContain('EXP(-LN(2) * gs."distance_km"');
      expect(rankingSql).not.toContain('WHEN gs."distance_km" >= ug."radius_km" THEN 0.0');
    });

    it("returns a geo score of 1 for a remote=full mission ranked with m3", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m3-remote",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-remote-full",
            mission_scoring_id: "mission-scoring-remote-full",
            total_score: 0.9,
            taxonomy_score: 0.8,
            geo_score: 1,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-remote-full",
            taxonomy_key: "domaine",
            taxonomy_score: 0.8,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m3-remote",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m3-remote",
        version: "m3",
      });

      expect(result.items[0].geoScore).toBe(1);
      expect(result.items[0].distanceKm).toBeNull();
    });

    it("returns the configured local geo score for a remote=local mission ranked with m3", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-m3-local",
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_id: "mission-remote-local",
            mission_scoring_id: "mission-scoring-remote-local",
            total_score: 0.815,
            taxonomy_score: 0.8,
            geo_score: 0.95,
            distance_km: null,
            closest_address_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-remote-local",
            taxonomy_key: "domaine",
            taxonomy_score: 0.8,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-m3-local",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-m3-local",
        version: "m3",
      });

      expect(result.items[0].geoScore).toBe(0.95);
      expect(result.items[0].distanceKm).toBeNull();
    });
  });
});
