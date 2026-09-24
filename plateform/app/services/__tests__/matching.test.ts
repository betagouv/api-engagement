import { beforeEach, describe, expect, it, vi } from "vitest";

const clientGetMock = vi.hoisted(() => vi.fn());

vi.mock("~/services/client", () => ({
  client: { get: clientGetMock },
}));

import { fetchInitialMatches, fetchMatches, paginateMatchingResults } from "~/services/matching";

describe("matching service", () => {
  beforeEach(() => {
    clientGetMock.mockReset();
  });

  it("récupère tous les résultats sans paramètres de pagination", async () => {
    const response = { items: [], total: 0, avgDistanceKmTop5: null, engineVersion: "m6", tookMs: 1 };
    const signal = new AbortController().signal;
    clientGetMock.mockResolvedValue(response);

    await expect(fetchMatches("scoring id", signal)).resolves.toBe(response);

    expect(clientGetMock).toHaveBeenCalledWith("/api/missions/match?userScoringId=scoring%20id", signal);
  });

  it("réutilise le lot complet mis en cache pour un même scoring", async () => {
    const response = { items: [], total: 0, avgDistanceKmTop5: null, engineVersion: "m6", tookMs: 1 };
    clientGetMock.mockResolvedValue(response);

    await Promise.all([fetchInitialMatches("cached-scoring"), fetchInitialMatches("cached-scoring")]);

    expect(clientGetMock).toHaveBeenCalledTimes(1);
  });
});

describe("paginateMatchingResults", () => {
  const results = Array.from({ length: 105 }, (_, index) => `mission-${index + 1}`);

  it("affiche localement dix résultats par page", () => {
    expect(paginateMatchingResults(results, 2)).toEqual({
      items: results.slice(10, 20),
      page: 2,
      totalPages: 10,
      totalResults: 100,
    });
  });

  it("termine les résultats à la page 10", () => {
    expect(paginateMatchingResults(results, 10)).toEqual({
      items: results.slice(90, 100),
      page: 10,
      totalPages: 10,
      totalResults: 100,
    });
  });

  it("ramène une page hors limite vers la dernière page disponible", () => {
    expect(paginateMatchingResults(results, 11).page).toBe(10);
  });

  it("affiche une dernière page partielle sans proposer de page supplémentaire", () => {
    const partialResults = results.slice(0, 95);

    expect(paginateMatchingResults(partialResults, 10)).toEqual({
      items: partialResults.slice(90, 95),
      page: 10,
      totalPages: 10,
      totalResults: 95,
    });
  });
});
