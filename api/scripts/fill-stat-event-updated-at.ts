import { prismaCore } from "../src/db/postgres";

const parseBatchSize = () => {
  const argIndex = process.argv.indexOf("--batch");
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    const raw = process.argv[argIndex + 1];
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 5000;
};

const parseLastId = () => {
  const idx = process.argv.indexOf("--last-id");
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};

const BATCH_SIZE = parseBatchSize();
const INITIAL_LAST_ID = parseLastId();

async function backfill() {
  let total = 0;
  let lastId: string | null = INITIAL_LAST_ID;

  while (true) {
    const where = lastId ? { id: { gt: lastId } } : undefined;

    const batch = await prismaCore.statEvent.findMany({
      where,
      select: { id: true, created_at: true, updated_at: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) {
      break;
    }

    const ids = batch.filter((row) => row.updated_at === null || row.updated_at < row.created_at).map((row) => row.id);

    if (ids.length > 0) {
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
      const sql = `UPDATE "StatEvent" SET updated_at = created_at WHERE id IN (${placeholders})`;
      await prismaCore.$executeRawUnsafe(sql, ...ids);

      total += ids.length;
      console.log(`Set updated_at for ${total} rows [cursor: ${lastId}]`);
    }

    const last = batch[batch.length - 1];
    lastId = last.id;
  }

  console.log(`Backfill completed. Total rows updated: ${total}`);
}

backfill()
  .catch((error) => {
    console.error("Error backfilling StatEvent.updated_at:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaCore.$disconnect();
  });
