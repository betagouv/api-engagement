import { TaxonomyKey } from "@/types/taxonomy";
import type { MatchingEngineDimensionWeights, MatchingEngineVersion } from "./types";
import { CURRENT_MATCHING_ENGINE_VERSION } from "./types";

type MatchingEngineVersionConfig = {
  dimensionWeights: MatchingEngineDimensionWeights;
};

export const MATCHING_ENGINE_VERSIONS = {
  m1: {
    dimensionWeights: {
      [TaxonomyKey.domaine]: 1,
      [TaxonomyKey.secteur_activite]: 1,
      [TaxonomyKey.type_mission]: 1,
      [TaxonomyKey.accessibilite]: 1,
      [TaxonomyKey.format_activite]: 1,
      [TaxonomyKey.competence_rome]: 1,
      [TaxonomyKey.engagement_civique]: 1,
      [TaxonomyKey.niveau_engagement]: 1,
      [TaxonomyKey.region_internationale]: 1,
    } satisfies MatchingEngineDimensionWeights,
  },
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_DIMENSION_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].dimensionWeights;
