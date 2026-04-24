import { ENRICHABLE_DIMENSIONS } from "@engagement/taxonomy";
import type { MatchingEngineDimensionWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_DIMENSIONS = ENRICHABLE_DIMENSIONS as readonly (keyof MatchingEngineDimensionWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m1";

export const MATCHING_ENGINE_VERSIONS = {
  m1: {
    dimensionWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
    } satisfies MatchingEngineDimensionWeights,
  },
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_DIMENSION_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].dimensionWeights;
