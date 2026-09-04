import { MATCHING_ENGINE_VERSION } from "@/config";
import { captureMessage } from "@/error";
import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES } from "@engagement/taxonomy";
import type { MatchingEngineTaxonomy, MatchingEngineTaxonomyWeights, MatchingEngineVersion, MatchingEngineVersionConfig } from "./types";

export const MATCHING_ENGINE_TAXONOMIES = [...ENRICHABLE_TAXONOMIES, ...GATE_TAXONOMIES] as readonly (keyof MatchingEngineTaxonomyWeights)[];

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

/** Version de matching utilisée par défaut si la variable d'env est absente ou invalide. */
export const DEFAULT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m3";

type MatchingEngineVersionDefinition = {
  // Taxonomies de ranking pondérées par ce moteur (choix explicite). Les gates sont ajoutées
  // automatiquement aux clés actives pour l'éligibilité, mais ne contribuent jamais au score.
  // Une nouvelle taxonomie globale n'a aucun impact tant qu'elle n'est pas ajoutée ici.
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
  // Optionnel (défaut false). Quand true, le score forcé remote=full est réservé aux utilisateurs
  // ayant coché « je veux participer à distance » ; les autres reçoivent un score géo de 0.
  gateRemoteFullGeoScoreOnIntent?: boolean;
  // Socle acquis d'office par taxonomie matchée (cf. MatchingEngineVersionConfig.taxonomyOrBaseScore).
  taxonomyOrBaseScore: number;
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
    gateRemoteFullGeoScoreOnIntent: definition.gateRemoteFullGeoScoreOnIntent ?? false,
    taxonomyOrBaseScore: definition.taxonomyOrBaseScore,
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
    taxonomyOrBaseScore: 0.8,
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
    taxonomyOrBaseScore: 0.8,
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
    taxonomyOrBaseScore: 0.8,
  }),
  m4: defineMatchingEngineVersion({
    // Identique à m3 côté géo, mais pondère les taxonomies du nouveau parcours de recommandation
    // (quiz v2) selon leur pouvoir discriminant, et non plus toutes à 1.
    //
    // Poids forts (nouvelles taxonomies bien enrichies, centrales dans le besoin exprimé) :
    //   - domaine_engagement (é7) : question centrale du besoin ;
    //   - activite (é9)           : quel rôle jouer, discrimine dans un même domaine ;
    //   - rythme (é6)             : critère de compatibilité (mauvais rythme = mauvaise reco).
    // Poids faibles (info rarement explicite côté annonces) :
    //   - equipe / interaction / autonomie / imprevu.
    // motivation_recherche reste à 1 : elle porte indemnisation/remote (injectés par SCORING_RULES)
    // et les autres motivations enrichies par le LLM ; l'amplification conditionnelle éventuelle
    // (indemnisation, sécurité du pays) relèvera de règles/boost, pas d'un poids de taxonomie.
    //
    // Les 7 anciennes taxonomies restent pondérées à 1 pour la rétro-compatibilité : une mission
    // encore enrichie en v3 (prod, ou staging pas encore ré-enrichie) continue de matcher dessus.
    // Comme le quiz v2 ne pose plus ces questions, un utilisateur v2 n'y répond pas → elles restent
    // hors de son dénominateur et ces poids sont neutres pour lui. Symétriquement, les nouvelles
    // taxonomies sont inertes tant que la mission n'a pas de score dessus (dégradation à 0, sans
    // exclusion). ⚠️ Les poids forts ne mordent donc qu'après ré-enrichissement du corpus en v5.
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
      domaine_engagement: 1.5,
      rythme: 1.2,
      activite: 1.5,
      equipe: 0.6,
      interaction: 0.6,
      autonomie: 0.6,
      imprevu: 0.6,
      motivation_recherche: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: 0.9,
    remoteLocalGeoScore: 0.95,
    // Socle abaissé (vs 0.8 des versions précédentes) : la qualité du match intra-taxonomie pèse
    // désormais 50 % au lieu de 20 %, ce qui creuse l'écart entre bonnes et mauvaises missions.
    taxonomyOrBaseScore: 0.5,
  }),
  m5: defineMatchingEngineVersion({
    // Identique à m4, mais le score de proximité forcé des missions entièrement à distance
    // (remote=full) n'est accordé qu'aux utilisateurs ayant coché « je veux participer à distance »
    // (motivation_recherche.remote). Les autres reçoivent un score géo de 0 sur ces missions : elles
    // restent affichables mais ne concurrencent plus les missions en présentiel proches. remote=local
    // (engagement de proximité) conserve son score inconditionnel.
    taxonomyWeights: {
      domaine: 1,
      secteur_activite: 1,
      type_mission: 1,
      competence_rome: 1,
      region_internationale: 1,
      engagement_intent: 1,
      formation_onisep: 1,
      domaine_engagement: 1.5,
      rythme: 1.2,
      activite: 1.5,
      equipe: 0.6,
      interaction: 0.6,
      autonomie: 0.6,
      imprevu: 0.6,
      motivation_recherche: 1,
    },
    geoWeight: 0.3,
    remoteFullGeoScore: 0.9,
    remoteLocalGeoScore: 0.95,
    gateRemoteFullGeoScoreOnIntent: true,
    taxonomyOrBaseScore: 0.5,
  }),
} as const satisfies Record<MatchingEngineVersion, MatchingEngineVersionConfig>;

export const MATCHING_ENGINE_VERSION_KEYS = Object.keys(MATCHING_ENGINE_VERSIONS) as [MatchingEngineVersion, ...MatchingEngineVersion[]];

// Résout la version active depuis l'env (cf. `MATCHING_ENGINE_VERSION`). Une valeur inconnue (typo,
// version supprimée) retombe sur le défaut plutôt que de renvoyer une config `undefined` ; on signale
// le fallback via Sentry pour ne pas masquer une mauvaise configuration.
export const resolveMatchingEngineVersion = (raw: string): MatchingEngineVersion => {
  if (Object.prototype.hasOwnProperty.call(MATCHING_ENGINE_VERSIONS, raw)) {
    return raw as MatchingEngineVersion;
  }
  captureMessage(`[matching-engine] unknown version "${raw}", falling back to "${DEFAULT_MATCHING_ENGINE_VERSION}"`);
  console.warn(`[matching-engine] unknown version "${raw}", falling back to "${DEFAULT_MATCHING_ENGINE_VERSION}"`);
  return DEFAULT_MATCHING_ENGINE_VERSION;
};

/** Version de matching active (pilotée par env, cf. `MATCHING_ENGINE_VERSION`). */
export const CURRENT_MATCHING_ENGINE_VERSION = resolveMatchingEngineVersion(MATCHING_ENGINE_VERSION);

export const MATCHING_ENGINE_TAXONOMY_WEIGHTS = MATCHING_ENGINE_VERSIONS[CURRENT_MATCHING_ENGINE_VERSION].taxonomyWeights;
