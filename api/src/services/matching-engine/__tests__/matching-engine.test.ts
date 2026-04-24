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

const prismaMock = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};

const missionMatchingResultRepositoryMock = missionMatchingResultRepository as unknown as {
  createForUserScoringVersion: ReturnType<typeof vi.fn>;
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
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-1",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-1",
        limit: 1,
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
      ]);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-1",
        matchingEngineVersion: CURRENT_MATCHING_ENGINE_VERSION,
        results: [
          {
            missionScoringId: "mission-scoring-1",
            dimensionScores: {
              domaine: 1,
            },
          },
          {
            missionScoringId: "mission-scoring-2",
            dimensionScores: {},
          },
        ],
      });
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
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-empty",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-empty",
      });

      expect(result.items).toEqual([]);
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).toHaveBeenCalledWith({
        userScoringId: "user-scoring-empty",
        matchingEngineVersion: CURRENT_MATCHING_ENGINE_VERSION,
        results: [],
      });
    });

    it("returns only missions that remain after gate exclusion", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-gate-filtered",
            expires_at: null,
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
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-eligible",
            dimension_key: "domaine",
            dimension_score: 0.8,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-gate",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-gate-filtered",
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result.items).toEqual([
        {
          missionId: "mission-eligible",
          missionScoringId: "mission-scoring-eligible",
          totalScore: 0.8,
          taxonomyScore: 0.8,
          geoScore: null,
          distanceKm: null,
          dimensionScores: {
            domaine: 0.8,
          },
        },
      ]);
    });

    it("keeps excluded missions out of the final payload and ignores their dimension rows", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-gate-dimensions",
            expires_at: null,
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
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-1",
            dimension_key: "domaine",
            dimension_score: 0.7,
          },
          {
            mission_scoring_id: "mission-scoring-excluded",
            dimension_key: "domaine",
            dimension_score: 0.2,
          },
          {
            mission_scoring_id: "mission-scoring-1",
            dimension_key: "tranche_age",
            dimension_score: 1,
          },
        ]);
      missionMatchingResultRepositoryMock.createForUserScoringVersion.mockResolvedValue({
        id: "mission-matching-result-gate-dimensions",
      });

      const result = await matchingEngineService.rankMissionsByUserScoring({
        userScoringId: "user-scoring-gate-dimensions",
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result.items).toEqual([
        {
          missionId: "mission-1",
          missionScoringId: "mission-scoring-1",
          totalScore: 0.7,
          taxonomyScore: 0.7,
          geoScore: null,
          distanceKm: null,
          dimensionScores: {
            domaine: 0.7,
          },
        },
      ]);
    });

    it("does not persist a snapshot when the caller requests an offset page", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "user-scoring-page-2",
            expires_at: null,
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
          },
        ])
        .mockResolvedValueOnce([
          {
            mission_scoring_id: "mission-scoring-2",
            dimension_key: "domaine",
            dimension_score: 0.6,
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
          totalScore: 0.6,
          taxonomyScore: 0.6,
          geoScore: null,
          distanceKm: null,
          dimensionScores: {
            domaine: 0.6,
          },
        },
      ]);
      expect(missionMatchingResultRepositoryMock.createForUserScoringVersion).not.toHaveBeenCalled();
    });
  });
});
