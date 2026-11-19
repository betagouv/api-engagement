import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";

// À exécuter workers d'enrichissement arrêtés et drainés.
const dryRun = process.argv.includes("--dry-run");

const run = async () => {
  await prisma.$transaction(
    async (tx) => {
      if (!dryRun) {
        // Sérialise aussi deux exécutions du script, sans bloquer les lectures du matching.
        await tx.$executeRaw`LOCK TABLE mission_enrichment, mission_enrichment_run IN SHARE ROW EXCLUSIVE MODE`;
      }
      const [result] = await tx.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM mission_enrichment e
      WHERE e.status IN ('completed', 'failed')
        AND NOT EXISTS (SELECT 1 FROM mission_enrichment_run r WHERE r.mission_enrichment_id = e.id)
    `;
      console.log(`[backfill-mission-enrichment-runs] ${dryRun ? "dry-run" : "apply"} candidates=${result.count}`);
      if (dryRun) {
        return;
      }
      const inserted = await tx.$executeRaw`
      INSERT INTO mission_enrichment_run (
        id, mission_enrichment_id, prompt_version, status,
        input_tokens, output_tokens, total_tokens,
        completed_at, created_at, updated_at
      )
      SELECT e.id, e.id, e.prompt_version, e.status,
        e.input_tokens, e.output_tokens, e.total_tokens,
        e.completed_at, e.created_at, now()
      FROM mission_enrichment e
      WHERE e.status IN ('completed', 'failed')
        AND NOT EXISTS (SELECT 1 FROM mission_enrichment_run r WHERE r.mission_enrichment_id = e.id)
      ON CONFLICT (id) DO NOTHING
    `;
      console.log(`[backfill-mission-enrichment-runs] inserted=${inserted}`);
    },
    { timeout: 120_000 }
  );
};

run()
  .catch((error) => {
    console.error("[backfill-mission-enrichment-runs] échec", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
