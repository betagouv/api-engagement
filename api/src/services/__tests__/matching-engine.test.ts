import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";

const prismaMock = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe("matchingEngineService", () => {
  beforeEach(() => {
    prismaMock.$queryRaw.mockReset();
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

    it("throws when the user scoring is expired", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        {
          id: "user-scoring-expired",
          expires_at: new Date(Date.now() - 60_000),
        },
      ]);

      await expect(
        matchingEngineService.rankMissionsByUserScoring({
          userScoringId: "user-scoring-expired",
        })
      ).rejects.toThrow("[matchingEngineService] user_scoring 'user-scoring-expired' is expired.");

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns ranked missions with clamped scores and indexed dimension scores", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-1",
            expires_at: new Date(Date.now() + 60_000),
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
          },
          {
            mission_id: "mission-2",
            mission_scoring_id: "mission-scoring-2",
            total_score: 0.4567891,
            taxonomy_score: 0.8765432,
            geo_score: null,
            distance_km: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-1",
            dimension_key: "domaine",
            dimension_score: 1.8,
          },
          {
            mission_scoring_id: "mission-scoring-1",
            dimension_key: "unknown_dimension",
            dimension_score: 0.9,
          },
          {
            mission_scoring_id: "mission-scoring-2",
            dimension_key: "format_activite",
            dimension_score: 0.3333333,
          },
        ]);

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-1",
        limit: 20,
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result.items).toEqual([
        {
          missionId: "mission-1",
          missionScoringId: "mission-scoring-1",
          totalScore: 1,
          taxonomyScore: 0,
          geoScore: 0.712346,
          distanceKm: 12.345,
          dimensionScores: {
            domaine: 1,
          },
        },
        {
          missionId: "mission-2",
          missionScoringId: "mission-scoring-2",
          totalScore: 0.456789,
          taxonomyScore: 0.876543,
          geoScore: null,
          distanceKm: null,
          dimensionScores: {
            format_activite: 0.333333,
          },
        },
      ]);
      expect(result.tookMs).toBeGreaterThanOrEqual(0);
    });

    it("does not query dimension scores when no mission is ranked", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-empty",
            expires_at: null,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-empty",
      });

      expect(result.items).toEqual([]);
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
