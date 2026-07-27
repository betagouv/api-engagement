import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES } from "@engagement/taxonomy";
import type { MatchingEngineTaxonomy, MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = [...ENRICHABLE_TAXONOMIES, ...GATE_TAXONOMIES] as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m3";

// Poids par défaut des taxonomies gate (`tranche_age`, …). Les gates sont une préoccupation
// transverse de sûreté ; elles sont toujours présentes dans la config avec ce poids, surchargeable.
const DEFAULT_GATE_WEIGHT = 1;

type MatchingEngineVersionDefinition = {
  // Taxonomies de ranking pondérées par ce moteur (choix explicite). Les gates y sont ajoutées
  // automatiquement avec `DEFAULT_GATE_WEIGHT` — les préciser ici ne sert qu'à surcharger le poids.
  // Une nouvelle taxonomie globale n'a aucun impact tant qu'elle n'est pas ajoutée ici.
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
};

export const defineMatchingEngineVersion = (definition: MatchingEngineVersionDefinition): MatchingEngineVersionConfig => {
  const taxonomyWeights: MatchingEngineTaxonomyWeights = {
    ...Object.fromEntries(GATE_TAXONOMIES.map((gate) => [gate, DEFAULT_GATE_WEIGHT])),
    ...definition.taxonomyWeights,
  };

  return {
    taxonomyKeys: Object.keys(taxonomyWeights) as MatchingEngineTaxonomy[],
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
