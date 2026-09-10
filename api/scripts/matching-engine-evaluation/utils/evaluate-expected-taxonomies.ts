export type ExpectedTaxonomy = {
  taxonomy: string;
  values: Array<string | string[]>;
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
  found: boolean;
  firstPosition: number | null;
  positions: number[];
  matchedMissions: MatchedMission[];
};

/**
 * Vérifie chaque valeur attendue d'une taxonomie. Une liste imbriquée représente une
 * alternative : au moins une des valeurs de cette liste doit apparaître dans le classement.
 */
export const evaluateExpectedTaxonomies = (rankedMissions: RankedMissionForEvaluation[], expectedTaxonomies: ExpectedTaxonomy[]): ExpectedTaxonomyResult[] =>
  expectedTaxonomies.flatMap((expectedTaxonomy) =>
    expectedTaxonomy.values.map((expectation) => {
      const expectedValues = Array.isArray(expectation) ? expectation : [expectation];
      const matchedMissions = rankedMissions.flatMap((mission, index): MatchedMission[] => {
        const matches = mission.taxonomyValues.some(({ taxonomy, value }) => taxonomy === expectedTaxonomy.taxonomy && expectedValues.includes(value));
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

      return {
        taxonomy: expectedTaxonomy.taxonomy,
        expectedValues,
        found: positions.length > 0,
        firstPosition: positions[0] ?? null,
        positions,
        matchedMissions,
      };
    })
  );
