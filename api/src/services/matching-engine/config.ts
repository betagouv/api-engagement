import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES } from "@engagement/taxonomy";
import type { GateTaxonomyKey } from "@engagement/taxonomy";
import { PROMPT_REGISTRY } from "@/services/mission-enrichment/prompts";
import type { PromptVersion } from "@/services/mission-enrichment/prompts";
import type { MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = [...ENRICHABLE_TAXONOMIES, ...GATE_TAXONOMIES] as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m3";

type PromptTaxonomyKey<P extends PromptVersion> = (typeof PROMPT_REGISTRY)[P]["TAXONOMY_KEYS"][number];
type MatchingEngineTaxonomyForPrompt<P extends PromptVersion> = PromptTaxonomyKey<P> | GateTaxonomyKey;

type MatchingEngineVersionDefinition<P extends PromptVersion> = {
  promptVersion: P;
  taxonomyWeights: Record<MatchingEngineTaxonomyForPrompt<P>, number>;
  geoWeight: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
};

export const defineMatchingEngineVersion = <P extends PromptVersion>(definition: MatchingEngineVersionDefinition<P>): MatchingEngineVersionConfig => {
  const taxonomyKeys = [...new Set([...PROMPT_REGISTRY[definition.promptVersion].TAXONOMY_KEYS, ...GATE_TAXONOMIES])] as MatchingEngineTaxonomyForPrompt<P>[];
  const expectedTaxonomyKeys = new Set<string>(taxonomyKeys);
  const configuredTaxonomyKeys = Object.keys(definition.taxonomyWeights);
  const missingTaxonomyKeys = taxonomyKeys.filter((taxonomyKey) => !Object.prototype.hasOwnProperty.call(definition.taxonomyWeights, taxonomyKey));
  const unknownTaxonomyKeys = configuredTaxonomyKeys.filter((taxonomyKey) => !expectedTaxonomyKeys.has(taxonomyKey));

  if (missingTaxonomyKeys.length > 0 || unknownTaxonomyKeys.length > 0) {
    throw new Error([
      `[matching-engine] configuration invalide pour le prompt ${definition.promptVersion}`,
      missingTaxonomyKeys.length > 0 ? `taxonomies manquantes : ${missingTaxonomyKeys.join(", ")}` : null,
      unknownTaxonomyKeys.length > 0 ? `taxonomies absentes du prompt : ${unknownTaxonomyKeys.join(", ")}` : null,
    ].filter(Boolean).join(" — "));
  }

  return {
    promptVersion: definition.promptVersion,
    taxonomyKeys: taxonomyKeys as MatchingEngineVersionConfig["taxonomyKeys"],
    taxonomyWeights: definition.taxonomyWeights,
    geoWeight: definition.geoWeight,
    remoteFullGeoScore: definition.remoteFullGeoScore,
    remoteLocalGeoScore: definition.remoteLocalGeoScore,
  };
};

export const MATCHING_ENGINE_VERSIONS = {
  m1: defineMatchingEngineVersion({
    promptVersion: "v1",
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
      tranche_age: 1,
    },
    geoWeight: 0.7,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  }),
  m2: defineMatchingEngineVersion({
    promptVersion: "v2",
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
      tranche_age: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: null,
    remoteLocalGeoScore: null,
  }),
  m3: defineMatchingEngineVersion({
    // Identique à m2, mais les missions remote=full/local sont considérées comme naturellement proches.
    // Le remote=local est le signal géo le plus fort (au-dessus de remote=full) : une mission "locale"
    // (engagement de proximité) est mise en avant devant une mission entièrement à distance.
    promptVersion: "v3",
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
      tranche_age: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: 0.9,
    remoteLocalGeoScore: 0.95,
  }),
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_VERSION_KEYS = Object.keys(MATCHING_ENGINE_VERSIONS) as [MatchingEngineVersion, ...MatchingEngineVersion[]];

export const MATCHING_ENGINE_TAXONOMY_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].taxonomyWeights;
