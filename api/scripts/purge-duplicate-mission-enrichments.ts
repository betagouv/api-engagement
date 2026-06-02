/**
 * Purge des `mission_enrichment` en doublon par (mission_id, prompt_version).
 *
 * Contexte : avant l'ajout de la contrainte unique (mission_id, prompt_version), chaque
 * ré-enrichissement créait une nouvelle ligne `completed` sans supprimer les précédentes
 * (~10 par mission). Ce script ne garde que la ligne « gagnante » du matching et supprime les
 * autres. Le cascade DB nettoie automatiquement mission_enrichment_value, mission_scoring et
 * mission_scoring_value rattachés.
 *
 * On garde, par (mission_id, prompt_version), la ligne avec le MÊME ordre que le CTE
 * active_mission_scorings du matching engine :
 *   ORDER BY completed_at DESC NULLS LAST, created_at DESC, id DESC
 * → aucun changement de résultat de matching.
 *
 * 100% set-based : aucune liste d'ids matérialisée côté JS (évite la limite de paramètres bind).
 * La suppression est batchée via LIMIT dans la sous-requête pour limiter le lock/WAL.
 *
 * Exécution :
 *   npx ts-node scripts/purge-duplicate-mission-enrichments.ts            # dry-run (défaut)
 *   npx ts-node scripts/purge-duplicate-mission-enrichments.ts --execute  # supprime réellement
 *   npx ts-node scripts/purge-duplicate-mission-enrichments.ts --execute --batch 5000
 *
 * À lancer AVANT de créer la contrainte unique (sinon la création de l'index échoue).
 */
import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

const LABEL = "purge-duplicate-mission-enrichments";

const parseFlagValue = (flag: string): string | null => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};

const execute = process.argv.includes("--execute");
const batchSize = Math.max(1, Number(parseFlagValue("--batch") ?? "5000"));

// Lignes à supprimer = tout sauf la « gagnante » de chaque (mission, version).
const duplicatesIdsSql = Prisma.sql`
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "mission_id", "prompt_version"
        ORDER BY "completed_at" DESC NULLS LAST, "created_at" DESC, "id" DESC
      ) AS rn
    FROM "mission_enrichment"
  ) ranked
  WHERE ranked.rn > 1
`;

const run = async () => {
  console.log(`[${LABEL}] Mode: ${execute ? "EXECUTE (suppression réelle)" : "dry-run"} · batch=${batchSize}`);
  await prisma.$connect();

  // Comptage set-based (pas de matérialisation d'ids).
  const [{ duplicates }] = await prisma.$queryRaw<{ duplicates: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS duplicates FROM (${duplicatesIdsSql}) d
  `);
  console.log(`[${LABEL}] Enrichissements en doublon à supprimer : ${duplicates}`);

  if (duplicates === 0n) {
    console.log(`[${LABEL}] Rien à purger.`);
    return;
  }

  // Aperçu de l'impact cascade (lecture seule), pour valider l'ampleur avant exécution.
  const [{ scorings }] = await prisma.$queryRaw<{ scorings: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS scorings
    FROM "mission_scoring" ms
    JOIN (${duplicatesIdsSql}) d ON d."id" = ms."mission_enrichment_id"
  `);
  console.log(`[${LABEL}] mission_scoring qui seront supprimés en cascade : ${scorings}`);

  if (!execute) {
    console.log(`[${LABEL}] Dry-run : aucune suppression. Relancer avec --execute pour purger.`);
    return;
  }

  let deleted = 0;
  for (;;) {
    // DELETE batché : on supprime un paquet d'ids "perdants" à la fois. Le cascade nettoie les enfants.
    const affected = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "mission_enrichment"
      WHERE "id" IN (${duplicatesIdsSql} LIMIT ${batchSize})
    `);
    deleted += affected;
    console.log(`[${LABEL}] supprimés: ${deleted}/${duplicates}`);
    if (affected === 0) {
      break;
    }
  }

  console.log(`[${LABEL}] Terminé. ${deleted} mission_enrichment supprimés (+ cascade values/scoring/scoring_value).`);
};

run()
  .catch((error) => {
    console.error(`[${LABEL}] Fatal error:`, error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
