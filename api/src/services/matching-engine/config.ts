import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES } from "@engagement/taxonomy";
import type { MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = [...ENRICHABLE_TAXONOMIES, ...GATE_TAXONOMIES] as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m3";

export const MATCHING_ENGINE_VERSIONS = {
  m1: {
    taxonomyWeights: {
      domaine: 1,
      domaine_engagement: 0,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      activite: 0,
      equipe: 0,
      interaction: 0,
      formation_onisep: 1,
      motivation_recherche: 0,
      rythme: 0,
      tranche_age: 1,
    } satisfies MatchingEngineTaxonomyWeights,
    geoWeight: 0.7,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  },
  m2: {
    taxonomyWeights: {
      domaine: 1,
      domaine_engagement: 0,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      activite: 0,
      equipe: 0,
      interaction: 0,
      formation_onisep: 1,
      motivation_recherche: 0,
      rythme: 0,
      tranche_age: 1,
    } satisfies MatchingEngineTaxonomyWeights,
    geoWeight: 0.3,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  },
  m3: {
    // Identique à m2, mais les missions remote=full/local sont considérées comme naturellement proches.
    // Le remote=local est le signal géo le plus fort (au-dessus de remote=full) : une mission "locale"
    // (engagement de proximité) est mise en avant devant une mission entièrement à distance.
    taxonomyWeights: {
      domaine: 1,
      domaine_engagement: 0,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      activite: 0,
      equipe: 0,
      interaction: 0,
      formation_onisep: 1,
      motivation_recherche: 0,
      rythme: 0,
      tranche_age: 1,
    } satisfies MatchingEngineTaxonomyWeights,
    geoWeight: 0.3,
    remoteFullGeoScore: 0.9,
    remoteLocalGeoScore: 0.95,
  },
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_VERSION_KEYS = Object.keys(MATCHING_ENGINE_VERSIONS) as [MatchingEngineVersion, ...MatchingEngineVersion[]];

export const MATCHING_ENGINE_TAXONOMY_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].taxonomyWeights;
