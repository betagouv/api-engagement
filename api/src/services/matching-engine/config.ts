import type { MatchingEngineDimensionWeights, MatchingEngineVersion } from "./types";
import { CURRENT_MATCHING_ENGINE_VERSION } from "./types";

type MatchingEngineVersionConfig = {
  dimensionWeights: MatchingEngineDimensionWeights;
};

export const MATCHING_ENGINE_VERSIONS = {
  m1: {
    dimensionWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
    } satisfies MatchingEngineDimensionWeights,
  },
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_DIMENSION_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].dimensionWeights;
