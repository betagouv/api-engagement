export type ExpectedTaxonomy = {
  taxonomy: string;
  values: Array<{
    value: string;
    min: number;
    max?: number;
  }>;
};

export type RankedMissionForEvaluation = {
  missionId: string;
  missionScoringId: string;
  missionTitle: string | null;
  totalScore: number;
  taxonomyValues: Array<{
    taxonomy: string;
    value: string;
  }>;
};

export type MatchedMission = {
  position: number;
  missionId: string;
  missionScoringId: string;
  missionTitle: string | null;
  totalScore: number;
};

export type ExpectedTaxonomyResult = {
  taxonomy: string;
  expectedValues: string[];
  min: number;
  max?: number;
  count: number;
  found: boolean;
  firstPosition: number | null;
  positions: number[];
  matchedMissions: MatchedMission[];
};

/**
 * Vérifie que le nombre de missions portant chaque valeur attendue est compris dans
 * l'intervalle inclusif [min, max]. L'absence de max signifie qu'il n'y a pas de plafond.
 */
export const evaluateExpectedTaxonomies = (rankedMissions: RankedMissionForEvaluation[], expectedTaxonomies: ExpectedTaxonomy[]): ExpectedTaxonomyResult[] =>
  expectedTaxonomies.flatMap((expectedTaxonomy) =>
    expectedTaxonomy.values.map((expectation) => {
      const matchedMissions = rankedMissions.flatMap((mission, index): MatchedMission[] => {
        const matches = mission.taxonomyValues.some(({ taxonomy, value }) => taxonomy === expectedTaxonomy.taxonomy && value === expectation.value);
        return matches
          ? [
              {
                position: index + 1,
                missionId: mission.missionId,
                missionScoringId: mission.missionScoringId,
                missionTitle: mission.missionTitle,
                totalScore: mission.totalScore,
              },
            ]
          : [];
      });
      const positions = matchedMissions.map((mission) => mission.position);
      const count = matchedMissions.length;

      return {
        taxonomy: expectedTaxonomy.taxonomy,
        expectedValues: [expectation.value],
        min: expectation.min,
        max: expectation.max,
        count,
        found: count >= expectation.min && (expectation.max === undefined || count <= expectation.max),
        firstPosition: positions[0] ?? null,
        positions,
        matchedMissions,
      };
    })
  );
