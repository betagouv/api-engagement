/**
 * Nettoyage des activities sans mission rattachee.
 *
 * Execution:
 *   npx ts-node scripts/cleanup-orphan-activities.ts [--dry-run] [--batch <taille>]
 *
 * Par defaut, le script supprime. Utiliser --dry-run pour simuler.
 */
import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prismaCore } from "@/db/postgres";

type ActivityRow = {
  id: string;
  name: string;
  created_at: Date;
};

const parseFlagValue = (flag: string): string | null => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const dryRun = process.argv.includes("--dry-run");
const batchSize = Number(parseFlagValue("--batch") ?? "500");

const run = async () => {
  const startedAt = new Date();
  console.log(`[ActivityCleanup] Started at ${startedAt.toISOString()}`);
  console.log(`[ActivityCleanup] Mode: ${dryRun ? "dry-run" : "execute"}`);
  console.log(`[ActivityCleanup] Batch size: ${batchSize}`);

  await prismaCore.$connect();

  const rows = await prismaCore.$queryRaw<ActivityRow[]>(
    Prisma.sql`
      SELECT
        a."id",
        a."name",
        a."created_at"
      FROM "activity" a
      LEFT JOIN "mission_activity" ma ON ma."activity_id" = a."id"
      WHERE ma."activity_id" IS NULL
      ORDER BY a."created_at" ASC
    `
  );

  console.log(`[ActivityCleanup] Activities orphelines: ${rows.length}`);

  if (!rows.length) {
    console.log("[ActivityCleanup] Rien a supprimer.");
    return;
  }

  const ids = rows.map((row) => row.id);
  const sample = rows.slice(0, 20);
  console.log("[ActivityCleanup] Exemple d'activites orphelines (max 20):");
  for (const row of sample) {
    console.log(`- ${row.name} (${row.id})`);
  }

  if (dryRun) {
    console.log("[ActivityCleanup] Dry-run uniquement. Relancer sans --dry-run pour supprimer.");
    return;
  }

  let deleted = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const result = await prismaCore.activity.deleteMany({
      where: { id: { in: chunk } },
    });
    deleted += result.count;
  }

  console.log(`[ActivityCleanup] Suppression terminee (${deleted} lignes).`);
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
    console.error("[ActivityCleanup] Failed:", error);
    await shutdown(1);
  });
