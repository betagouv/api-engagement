/**
 * Backfill : calcule le champ search_text des organisations.
 *
 * Exécution :
 *   npx ts-node scripts/backfill-organization-search-text.ts [--batch <taille>] [--last-id <id>]
 */
import dotenv from "dotenv";

dotenv.config();

import { prismaCore } from "../src/db/postgres";
import { buildOrganizationSearchText } from "../src/utils/organization";

const parseBatchSize = () => {
  const idx = process.argv.indexOf("--batch");
  if (idx !== -1 && process.argv[idx + 1]) {
    const parsed = Number.parseInt(process.argv[idx + 1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 500;
};

const parseLastId = () => {
  const idx = process.argv.indexOf("--last-id");
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};

const BATCH_SIZE = parseBatchSize();
const INITIAL_LAST_ID = parseLastId();

const run = async () => {
  const startedAt = new Date();
  console.log(`[OrganizationSearchTextBackfill] Démarré à ${startedAt.toISOString()}. Batch=${BATCH_SIZE}.`);

  await prismaCore.$connect();

  let total = 0;
  let lastId: string | null = INITIAL_LAST_ID;

  while (true) {
    const where = {
      searchText: null,
      ...(lastId ? { id: { gt: lastId } } : {}),
    };

    const batch = await prismaCore.organization.findMany({
      where,
      select: { id: true, title: true, shortTitle: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) {
      break;
    }

    const updates = batch.map((row) => ({
      id: row.id,
      searchText: buildOrganizationSearchText(row.title, row.shortTitle),
    }));

    await prismaCore.$transaction(
      updates.map((row) =>
        prismaCore.organization.update({
          where: { id: row.id },
          data: { searchText: row.searchText },
        })
      )
    );

    total += updates.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`[OrganizationSearchTextBackfill] ${total} lignes mises à jour (lastId=${lastId}).`);
  }

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[OrganizationSearchTextBackfill] Terminé en ${(durationMs / 1000).toFixed(1)}s. Total=${total}.`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[OrganizationSearchTextBackfill] Échec:", error);
    await shutdown(1);
  });
