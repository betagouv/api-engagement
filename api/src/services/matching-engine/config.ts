import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES } from "@engagement/taxonomy";
import type { MatchingEngineTaxonomy, MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = [...ENRICHABLE_TAXONOMIES, ...GATE_TAXONOMIES] as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m3";

type MatchingEngineVersionDefinition = {
  // Taxonomies de ranking pondérées par ce moteur (choix explicite). Les gates sont ajoutées
  // automatiquement aux clés actives pour l'éligibilité, mais ne contribuent jamais au score.
  // Une nouvelle taxonomie globale n'a aucun impact tant qu'elle n'est pas ajoutée ici.
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
};

export const defineMatchingEngineVersion = (definition: MatchingEngineVersionDefinition): MatchingEngineVersionConfig => {
  const configuredGate = GATE_TAXONOMIES.find((gate) => gate in definition.taxonomyWeights);
  if (configuredGate) {
    throw new Error(`[matching-engine] Gate taxonomy '${configuredGate}' controls eligibility and cannot have a ranking weight`);
  }

  const taxonomyWeights = definition.taxonomyWeights;

  return {
    taxonomyKeys: [...Object.keys(taxonomyWeights), ...GATE_TAXONOMIES] as MatchingEngineTaxonomy[],
    taxonomyWeights,
    geoWeight: definition.geoWeight,
    remoteFullGeoScore: definition.remoteFullGeoScore,
    remoteLocalGeoScore: definition.remoteLocalGeoScore,
  };
};

export const MATCHING_ENGINE_VERSIONS = {
  m1: defineMatchingEngineVersion({
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
    },
    geoWeight: 0.7,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  }),
  m2: defineMatchingEngineVersion({
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  }),
  m3: defineMatchingEngineVersion({
    // Identique à m2, mais les missions remote=full/local sont considérées comme naturellement proches.
    // Le remote=local est le signal géo le plus fort (au-dessus de remote=full) : une mission "locale"
    // (engagement de proximité) est mise en avant devant une mission entièrement à distance.
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: 0.9,
    remoteLocalGeoScore: 0.95,
  }),
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_VERSION_KEYS = Object.keys(MATCHING_ENGINE_VERSIONS) as [MatchingEngineVersion, ...MatchingEngineVersion[]];

export const MATCHING_ENGINE_TAXONOMY_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].taxonomyWeights;
