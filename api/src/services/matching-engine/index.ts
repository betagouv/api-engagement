import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { MATCHING_ENGINE_TOP_RESULTS_LIMIT } from "./config";
import { applyConfiguredDispositifCoverage, loadCoverageDispositifs } from "./dispositif-coverage";
import { resolveRankingParams } from "./ranking-params";
import { buildRankingQueryForInput } from "./ranking-query";
import type { DbRankRow } from "./ranking-types";
import { buildMissionMatchingResultItems, collectMissionScoringIdsForDetails, computeAvgDistanceKmTop5, mapMatchMissionItems, selectResponseRows } from "./result-mapper";
import { loadTaxonomyScores } from "./taxonomy-scores";
import type { RankMissionsByUserScoringInput, RankMissionsByUserScoringResult } from "./types";
import { assertUserScoringExists } from "./user-scoring";

export const matchingEngineService = {
  async rankMissionsByUserScoring(input: RankMissionsByUserScoringInput): Promise<RankMissionsByUserScoringResult> {
    const startedAt = Date.now();
    const params = resolveRankingParams(input);

    // 1. Valider le profil et charger les préférences qui influencent la constitution du pool.
    await assertUserScoringExists(input.userScoringId);
    const coverageDispositifs = params.dispositifCoverage === null ? [] : await loadCoverageDispositifs(input.userScoringId);

    // 2. PostgreSQL filtre les missions, constitue les pools taxonomique/géographique, puis calcule
    // le score combiné. C'est la seule requête qui parcourt l'ensemble des missions éligibles.
    const rows = await prisma.$queryRaw<DbRankRow[]>(buildRankingQueryForInput(input, coverageDispositifs));

    // 3. Certaines versions garantissent une représentation minimale des dispositifs demandés.
    // Cette étape réordonne le top sans toucher aux scores calculés par PostgreSQL.
    const orderedRows = await applyConfiguredDispositifCoverage(rows, coverageDispositifs, params.dispositifCoverage);
    const responseRows = selectResponseRows({
      rows: orderedRows,
      limit: params.limit,
      offset: params.offset,
      shouldPersistTopResults: params.shouldPersistTopResults,
      hasDispositifCoverage: params.dispositifCoverage !== null,
    });

    // 4. Charger le détail par taxonomie uniquement pour les missions visibles ou persistées.
    const missionScoringIdsForDetails = collectMissionScoringIdsForDetails({
      responseRows,
      orderedRows,
      shouldPersistTopResults: params.shouldPersistTopResults,
      snapshotLimit: MATCHING_ENGINE_TOP_RESULTS_LIMIT,
    });
    const taxonomyScores = await loadTaxonomyScores({
      userScoringId: input.userScoringId,
      missionScoringIds: missionScoringIdsForDetails,
      taxonomyKeys: params.rankingTaxonomyKeys,
      taxonomyOrBaseScore: params.taxonomyOrBaseScore,
    });

    // 5. Le snapshot conserve le top stable de la première page pour les usages aval.
    if (params.shouldPersistTopResults) {
      await missionMatchingResultRepository.createForUserScoringVersion({
        userScoringId: input.userScoringId,
        matchingEngineVersion: params.version,
        results: buildMissionMatchingResultItems(orderedRows.slice(0, MATCHING_ENGINE_TOP_RESULTS_LIMIT), taxonomyScores),
      });
    }

    return {
      version: params.version,
      items: mapMatchMissionItems(responseRows, taxonomyScores),
      tookMs: Date.now() - startedAt,
      total: rows.length > 0 ? Number(rows[0].total_count) : 0,
      avgDistanceKmTop5: computeAvgDistanceKmTop5(orderedRows, params.offset),
    };
  },

  /** Renvoie le plan d'exécution du même SQL que le classement, pour le diagnostic de performance. */
  async explainRanking(input: RankMissionsByUserScoringInput): Promise<string> {
    await assertUserScoringExists(input.userScoringId);
    const { dispositifCoverage } = resolveRankingParams(input);
    const coverageDispositifs = dispositifCoverage === null ? [] : await loadCoverageDispositifs(input.userScoringId);
    const sql = buildRankingQueryForInput(input, coverageDispositifs);
    const rows = await prisma.$queryRaw<Array<Record<string, string>>>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);

    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  },
};

export default matchingEngineService;
