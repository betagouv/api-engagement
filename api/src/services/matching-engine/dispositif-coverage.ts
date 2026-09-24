import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import type { DbRankRow } from "./ranking-types";

type DbMatchedDispositifRow = {
  mission_scoring_id: string;
  value_key: string;
};

type DbUserScoringValueRow = {
  value_key: string;
};

type DispositifCoverage = { limit: number };

/** Charge les dispositifs que le profil demande explicitement de voir représentés. */
export const loadCoverageDispositifs = async (userScoringId: string): Promise<string[]> => {
  const values = await prisma.$queryRaw<DbUserScoringValueRow[]>`
    SELECT "value_key"
    FROM "user_scoring_value"
    WHERE "user_scoring_id" = ${userScoringId}
      AND "taxonomy_key" = 'dispositif'
  `;

  return values.map((value) => value.value_key);
};

const loadMatchedDispositifs = async (coverageDispositifs: string[], rows: DbRankRow[]): Promise<DbMatchedDispositifRow[]> =>
  prisma.$queryRaw<DbMatchedDispositifRow[]>(Prisma.sql`
    SELECT DISTINCT
      msv."mission_scoring_id",
      msv."value_key"
    FROM "mission_scoring_value" msv
    WHERE msv."taxonomy_key" = 'dispositif'
      AND msv."value_key" IN (${Prisma.join(coverageDispositifs)})
      AND msv."mission_scoring_id" IN (${Prisma.join(rows.map((row) => row.mission_scoring_id))})
  `);

/**
 * Garantit qu'au moins une mission de chaque dispositif demandé apparaît dans le top de couverture.
 *
 * Le score n'est jamais modifié. Une mission absente du top peut seulement remplacer, en partant
 * du bas, une mission dont tous les dispositifs restent déjà représentés ailleurs. L'ordre du reste
 * du classement est conservé.
 */
export const applyDispositifCoverage = (rows: DbRankRow[], matches: DbMatchedDispositifRow[], requiredDispositifs: string[], coverage: DispositifCoverage): DbRankRow[] => {
  if (rows.length <= coverage.limit || matches.length === 0) {
    return rows;
  }

  const dispositifsByMissionScoringId = new Map<string, string[]>();
  for (const match of matches) {
    const dispositifs = dispositifsByMissionScoringId.get(match.mission_scoring_id) ?? [];
    dispositifs.push(match.value_key);
    dispositifsByMissionScoringId.set(match.mission_scoring_id, dispositifs);
  }

  const topRows = rows.slice(0, coverage.limit);
  const topDispositifCounts = new Map<string, number>();
  for (const row of topRows) {
    for (const dispositif of dispositifsByMissionScoringId.get(row.mission_scoring_id) ?? []) {
      topDispositifCounts.set(dispositif, (topDispositifCounts.get(dispositif) ?? 0) + 1);
    }
  }

  for (const requiredDispositif of requiredDispositifs) {
    if ((topDispositifCounts.get(requiredDispositif) ?? 0) > 0) {
      continue;
    }

    // Le SQL a déjà ajouté le meilleur candidat de chaque dispositif au pool. Le premier match
    // trouvé sous la limite de couverture est donc le meilleur candidat promouvable.
    const promotedRow = rows
      .slice(coverage.limit)
      .find((row) => (dispositifsByMissionScoringId.get(row.mission_scoring_id) ?? []).includes(requiredDispositif) && !topRows.includes(row));
    if (!promotedRow) {
      continue;
    }

    let replacementIndex = -1;
    for (let index = topRows.length - 1; index >= 0; index--) {
      const canReplace = (dispositifsByMissionScoringId.get(topRows[index].mission_scoring_id) ?? []).every((dispositif) => (topDispositifCounts.get(dispositif) ?? 0) > 1);
      if (canReplace) {
        replacementIndex = index;
        break;
      }
    }
    if (replacementIndex < 0) {
      break;
    }

    const replacedRow = topRows[replacementIndex];
    for (const dispositif of dispositifsByMissionScoringId.get(replacedRow.mission_scoring_id) ?? []) {
      topDispositifCounts.set(dispositif, (topDispositifCounts.get(dispositif) ?? 0) - 1);
    }
    topRows[replacementIndex] = promotedRow;
    for (const dispositif of dispositifsByMissionScoringId.get(promotedRow.mission_scoring_id) ?? []) {
      topDispositifCounts.set(dispositif, (topDispositifCounts.get(dispositif) ?? 0) + 1);
    }
  }

  const topMissionScoringIds = new Set(topRows.map((row) => row.mission_scoring_id));
  return [...topRows, ...rows.filter((row) => !topMissionScoringIds.has(row.mission_scoring_id))];
};

export const applyConfiguredDispositifCoverage = async (rows: DbRankRow[], coverageDispositifs: string[], coverage: DispositifCoverage | null): Promise<DbRankRow[]> => {
  if (coverage === null || coverageDispositifs.length === 0 || rows.length === 0) {
    return rows;
  }

  const matches = await loadMatchedDispositifs(coverageDispositifs, rows);
  return applyDispositifCoverage(rows, matches, coverageDispositifs, coverage);
};
