import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-scoring", () => ({
  missionScoringService: {
    score: vi.fn(),
  },
}));

import { missionScoringService } from "@/services/mission-scoring";
import { handleMissionScoring } from "@/worker/handlers/mission-scoring";
import { missionScoringPayloadSchema } from "@/worker/types";

const missionScoringServiceMock = missionScoringService as unknown as {
  score: ReturnType<typeof vi.fn>;
};

describe("mission scoring worker", () => {
  it("accepts the enriched mission scoring payload", () => {
    expect(
      missionScoringPayloadSchema.parse({
        missionId: "mission-1",
        missionEnrichmentId: "enrichment-1",
        force: true,
      })
    ).toEqual({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      force: true,
    });
  });

  it("forwards the payload to the mission scoring service", async () => {
    missionScoringServiceMock.score.mockResolvedValue(undefined);

    await handleMissionScoring({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      force: true,
    });

    expect(missionScoringServiceMock.score).toHaveBeenCalledWith({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      force: true,
    });
  });
});
