import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_RESULTS_LIMIT, MATCHING_ENGINE_TOP_RESULTS_LIMIT, MATCHING_ENGINE_VERSIONS } from "./config";
import type { MatchingEngineTaxonomy, RankMissionsByUserScoringInput } from "./types";

// Les pools sont plus larges que la page demandée afin qu'un bon candidat géographique ou
// taxonomique ne disparaisse pas avant le calcul du score combiné.
const TAXONOMY_CANDIDATE_MULTIPLIER = 100;
const MIN_TAXONOMY_CANDIDATE_LIMIT = 1000;
const GEO_CANDIDATE_MULTIPLIER = 50;
const MIN_GEO_CANDIDATE_LIMIT = 1000;

const getTaxonomyCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * TAXONOMY_CANDIDATE_MULTIPLIER, MIN_TAXONOMY_CANDIDATE_LIMIT);

const getGeoCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * GEO_CANDIDATE_MULTIPLIER, MIN_GEO_CANDIDATE_LIMIT);

/**
 * Résout tous les paramètres effectifs d'un classement.
 *
 * Cette fonction est l'unique point où les valeurs fournies par l'appelant sont combinées avec
 * celles de la version du moteur. Le classement normal et EXPLAIN partagent ainsi exactement les
 * mêmes paramètres.
 */
export const resolveRankingParams = (input: RankMissionsByUserScoringInput) => {
  const version = input.version ?? CURRENT_MATCHING_ENGINE_VERSION;
  const versionConfig = MATCHING_ENGINE_VERSIONS[version];
  const limit = Math.max(1, Math.min(500, input.limit ?? MATCHING_ENGINE_RESULTS_LIMIT));
  const offset = Math.max(0, input.offset ?? 0);
  const dispositifCoverage = versionConfig.dispositifCoverage;

  // Le snapshot persistant représente toujours la première page. Il peut nécessiter de charger
  // plus de lignes que la réponse demandée, sans modifier la pagination visible par l'appelant.
  const shouldPersistTopResults = offset === 0 && input.persistMatchingResult !== false;

  // La couverture des dispositifs réordonne le top N en mémoire. On doit donc charger le classement
  // depuis son début, appliquer la couverture, puis seulement découper la page demandée.
  const rankingOffset = dispositifCoverage === null ? offset : 0;
  const rankingLimit =
    dispositifCoverage === null
      ? shouldPersistTopResults
        ? Math.max(limit, MATCHING_ENGINE_TOP_RESULTS_LIMIT)
        : limit
      : Math.max(offset + limit, MATCHING_ENGINE_RESULTS_LIMIT, shouldPersistTopResults ? MATCHING_ENGINE_TOP_RESULTS_LIMIT : 0);

  return {
    version,
    limit,
    offset,
    shouldPersistTopResults,
    rankingLimit,
    rankingOffset,
    dispositifCoverage,
    taxonomyWeights: versionConfig.taxonomyWeights,
    rankingTaxonomyKeys: Object.keys(versionConfig.taxonomyWeights) as MatchingEngineTaxonomy[],
    taxonomyWeight: input.taxonomyWeight ?? 0.3,
    geoWeight: input.geoWeight ?? versionConfig.geoWeight,
    geoHalfDecayKm: input.geoHalfDecayKm ?? 20,
    missingGeoScore: input.missingGeoScore ?? 0.1,
    remoteFullGeoScore: input.remoteFullGeoScore !== undefined ? input.remoteFullGeoScore : versionConfig.remoteFullGeoScore,
    remoteLocalGeoScore: input.remoteLocalGeoScore !== undefined ? input.remoteLocalGeoScore : versionConfig.remoteLocalGeoScore,
    gateRemoteFullGeoScoreOnIntent: versionConfig.gateRemoteFullGeoScoreOnIntent,
    taxonomyOrBaseScore: input.taxonomyOrBaseScore ?? versionConfig.taxonomyOrBaseScore,
    taxonomyCandidateLimit: getTaxonomyCandidateLimit({ limit: rankingLimit, offset: rankingOffset }),
    geoCandidateLimit: getGeoCandidateLimit({ limit: rankingLimit, offset: rankingOffset }),
  };
};

export type ResolvedRankingParams = ReturnType<typeof resolveRankingParams>;
