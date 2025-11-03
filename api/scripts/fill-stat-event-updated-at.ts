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

const BATCH_SIZE = parseBatchSize();

async function backfill() {
  let total = 0;

  let rows = await prismaCore.statEvent.findMany({
    where: { updated_at: null },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { created_at: "asc" },
  });

  while (rows.length > 0) {
    const ids = rows.map((row) => row.id);

    await prismaCore.$executeRawUnsafe(`UPDATE "StatEvent" SET updated_at = created_at WHERE id = ANY($1)`, ids);

    total += rows.length;
    console.log(`Set updated_at for ${total} rows…`);

    rows = await prismaCore.statEvent.findMany({
      where: { updated_at: null },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { created_at: "asc" },
    });
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
