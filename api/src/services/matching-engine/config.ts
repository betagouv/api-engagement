import { ENRICHABLE_TAXONOMIES } from "@engagement/taxonomy";
import type { MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = ENRICHABLE_TAXONOMIES as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m1";

export const MATCHING_ENGINE_VERSIONS = {
  m1: {
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
    } satisfies MatchingEngineTaxonomyWeights,
  },
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_TAXONOMY_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].taxonomyWeights;
