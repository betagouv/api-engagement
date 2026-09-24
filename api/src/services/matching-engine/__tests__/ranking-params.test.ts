import { describe, expect, it } from "vitest";

import { MATCHING_ENGINE_RESULTS_LIMIT } from "@/services/matching-engine/config";
import { resolveRankingParams } from "@/services/matching-engine/ranking-params";

describe("resolveRankingParams", () => {
  it("utilise la limite globale par défaut", () => {
    const params = resolveRankingParams({ userScoringId: "user-scoring-1", version: "m1" });

    expect(params.limit).toBe(MATCHING_ENGINE_RESULTS_LIMIT);
  });

  it("accepte une limite explicite en surcharge", () => {
    const params = resolveRankingParams({ userScoringId: "user-scoring-1", version: "m1", limit: 42 });

    expect(params.limit).toBe(42);
  });
});
