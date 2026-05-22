/**
 * Backfill : copie les anciennes PublisherDiffusion vers PublisherDiffusionRule.
 *
 * Exécuter après la migration Prisma qui crée publisher_diffusion_rule :
 *   npx ts-node scripts/backfill-publisher-diffusion-rules.ts --dry-run
 *   npx ts-node scripts/backfill-publisher-diffusion-rules.ts
 */
import dotenv from "dotenv";

dotenv.config();

import { prisma } from "../src/db/postgres";

const isDryRun = process.argv.includes("--dry-run");

type CountRow = { count: bigint | number };

const toCount = (value: bigint | number | undefined): number => Number(value ?? 0);

const countRows = async (tableName: "publisher_diffusion" | "publisher_diffusion_rule"): Promise<number> => {
  const result =
    tableName === "publisher_diffusion"
      ? await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint AS "count"
          FROM "public"."publisher_diffusion"
        `
      : await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::bigint AS "count"
          FROM "public"."publisher_diffusion_rule"
        `;

  return toCount(result[0]?.count);
};

const backfillPublisherDiffusionRules = async (): Promise<number> =>
  prisma.$executeRaw`
    INSERT INTO "public"."publisher_diffusion_rule" (
      "id",
      "publisher_id",
      "field",
      "field_type",
      "operator",
      "value",
      "combinator",
      "position",
      "created_at",
      "updated_at"
    )
    SELECT
      pd."id",
      pd."annonceur_publisher_id",
      'publisherId',
      'string',
      'is',
      pd."diffuseur_publisher_id",
      'or',
      ROW_NUMBER() OVER (
        PARTITION BY pd."annonceur_publisher_id"
        ORDER BY pd."created_at", pd."id"
      ) - 1,
      pd."created_at",
      pd."updated_at"
    FROM "public"."publisher_diffusion" pd
    ON CONFLICT ("id") DO UPDATE SET
      "publisher_id" = EXCLUDED."publisher_id",
      "field" = EXCLUDED."field",
      "field_type" = EXCLUDED."field_type",
      "operator" = EXCLUDED."operator",
      "value" = EXCLUDED."value",
      "combinator" = EXCLUDED."combinator",
      "position" = EXCLUDED."position",
      "created_at" = EXCLUDED."created_at",
      "updated_at" = EXCLUDED."updated_at";
  `;

const run = async () => {
  const startedAt = new Date();
  console.log(`[PublisherDiffusionRuleBackfill] Démarré à ${startedAt.toISOString()}${isDryRun ? " (dry-run)" : ""}.`);

  await prisma.$connect();

  const sourceCount = await countRows("publisher_diffusion");
  const existingRuleCount = await countRows("publisher_diffusion_rule");

  console.log(`[PublisherDiffusionRuleBackfill] publisher_diffusion=${sourceCount}`);
  console.log(`[PublisherDiffusionRuleBackfill] publisher_diffusion_rule=${existingRuleCount}`);

  if (isDryRun) {
    console.log(`[PublisherDiffusionRuleBackfill] ${sourceCount} règles seraient insérées ou mises à jour.`);
    return;
  }

  const upserted = await backfillPublisherDiffusionRules();
  const finalRuleCount = await countRows("publisher_diffusion_rule");

  console.log(`[PublisherDiffusionRuleBackfill] Règles insérées ou mises à jour: ${upserted}`);
  console.log(`[PublisherDiffusionRuleBackfill] publisher_diffusion_rule=${finalRuleCount}`);

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[PublisherDiffusionRuleBackfill] Terminé en ${(durationMs / 1000).toFixed(1)}s.`);
};

const shutdown = async (exitCode: number) => {
  await prisma.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[PublisherDiffusionRuleBackfill] Échec:", error);
    await shutdown(1);
  });
