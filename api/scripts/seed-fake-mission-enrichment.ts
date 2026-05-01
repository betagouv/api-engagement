/**
 * Génère de faux enrichissements de mission pour tester le scoring à volume.
 *
 * Exécution :
 *   npx ts-node scripts/seed-fake-mission-enrichment.ts [--reset] [--limit N] [--publisher-id X] [--prompt-version V] [--dry-run]
 *
 * Options :
 *   --reset              Supprime tous les enrichissements fake (_fake: true) toutes versions confondues,
 *                        ou uniquement la version spécifiée via --prompt-version
 *   --limit N            Traite au max N missions (défaut : illimité)
 *   --publisher-id X     Filtre par publisher
 *   --prompt-version V   Version du prompt à utiliser pour le seed/reset (défaut : CURRENT_PROMPT_VERSION)
 *   --dry-run            Log sans écrire en base
 */

import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isReset = args.includes("--reset");
const isDryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : undefined;
const publisherIdArg = args.indexOf("--publisher-id");
const publisherId = publisherIdArg !== -1 ? args[publisherIdArg + 1] : undefined;
const promptVersionArg = args.indexOf("--prompt-version");
// For seed: always use a specific version (default: current). For reset: undefined = all versions.
const promptVersion = promptVersionArg !== -1 ? args[promptVersionArg + 1] : undefined;

const BATCH_SIZE = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomConfidence(): number {
  return parseFloat((Math.random() * 0.58 + 0.40).toFixed(4));
}

type TaxonomyWithValues = {
  id: string;
  key: string;
  type: string;
  values: { id: string; key: string }[];
};

function generateValues(taxonomies: TaxonomyWithValues[]): { taxonomyValueId: string; confidence: number }[] {
  const result: { taxonomyValueId: string; confidence: number }[] = [];

  for (const taxonomy of taxonomies) {
    const activeValues = taxonomy.values;
    if (activeValues.length === 0) continue;

    if (taxonomy.type === "categorical") {
      if (Math.random() < 0.80) {
        const picked = pickRandom(activeValues, 1)[0];
        result.push({ taxonomyValueId: picked.id, confidence: randomConfidence() });
      }
    } else if (taxonomy.type === "gate") {
      if (Math.random() < 0.30) {
        const picked = pickRandom(activeValues, 1)[0];
        result.push({ taxonomyValueId: picked.id, confidence: randomConfidence() });
      }
    } else {
      // multi_value / ordered
      const count = Math.floor(Math.random() * 3) + 1;
      const picked = pickRandom(activeValues, Math.min(count, activeValues.length));
      for (const v of picked) {
        result.push({ taxonomyValueId: v.id, confidence: randomConfidence() });
      }
    }
  }

  return result;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

async function reset() {
  const versionLabel = promptVersion ?? "toutes versions";
  console.log(`[seed-fake-mission-enrichment] Suppression des enrichissements fake (${versionLabel})...`);

  const where = {
    ...(promptVersion ? { promptVersion } : {}),
    rawResponse: { path: ["_fake"], equals: true },
  };

  if (isDryRun) {
    const count = await prisma.missionEnrichment.count({ where });
    console.log(`[seed-fake-mission-enrichment] [dry-run] ${count} enrichissements à supprimer`);
    return;
  }

  const { count } = await prisma.missionEnrichment.deleteMany({ where });
  console.log(`[seed-fake-mission-enrichment] ${count} enrichissements supprimés (cascade sur values + scorings)`);
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // Load all active taxonomy values
  const taxonomies = await prisma.taxonomy.findMany({
    include: { values: { where: { active: true }, select: { id: true, key: true } } },
  });

  if (taxonomies.length === 0) {
    console.error("[seed-fake-mission-enrichment] Aucune taxonomie trouvée — lancer seed-taxonomy d'abord");
    process.exit(1);
  }

  const seedVersion = promptVersion ?? CURRENT_PROMPT_VERSION;
  console.log(`[seed-fake-mission-enrichment] ${taxonomies.length} taxonomies chargées (version: ${seedVersion})`);

  // Query missions without a completed enrichment for the target version
  const missions = await prisma.mission.findMany({
    where: {
      ...(publisherId ? { publisherId } : {}),
      deletedAt: null,
      enrichments: {
        none: { promptVersion: seedVersion, status: "completed" },
      },
    },
    select: { id: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  console.log(`[seed-fake-mission-enrichment] ${missions.length} missions à enrichir`);

  if (isDryRun) {
    console.log("[seed-fake-mission-enrichment] [dry-run] Aucune écriture effectuée");
    return;
  }

  let created = 0;
  let failed = 0;

  // Process in parallel batches
  for (let i = 0; i < missions.length; i += BATCH_SIZE) {
    const batch = missions.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (mission) => {
        try {
          const values = generateValues(taxonomies);
          const rawResponse = {
            _fake: true,
            classifications: values.map((v) => ({
              taxonomyValueId: v.taxonomyValueId,
              confidence: v.confidence,
              evidence: { extract: "Extrait synthétique", reasoning: "Données générées pour tests de scoring" },
            })),
          };

          await prisma.$transaction(async (tx) => {
            const enrichment = await tx.missionEnrichment.create({
              data: {
                missionId: mission.id,
                promptVersion: seedVersion,
                status: "completed",
                rawResponse,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                completedAt: new Date(),
              },
              select: { id: true },
            });

            if (values.length > 0) {
              await tx.missionEnrichmentValue.createMany({
                data: values.map((v) => ({
                  enrichmentId: enrichment.id,
                  taxonomyValueId: v.taxonomyValueId,
                  confidence: v.confidence,
                  evidence: { extract: "Extrait synthétique", reasoning: "Données générées pour tests de scoring" },
                })),
                skipDuplicates: true,
              });
            }
          });

          created++;
        } catch (err) {
          failed++;
          console.error(`[seed-fake-mission-enrichment] Erreur sur mission ${mission.id}:`, err);
        }
      })
    );

    console.log(`[seed-fake-mission-enrichment] ${Math.min(i + BATCH_SIZE, missions.length)}/${missions.length} traitées (${created} créées, ${failed} erreurs)`);
  }

  console.log(`[seed-fake-mission-enrichment] Terminé — ${created} enrichissements créés, ${failed} erreurs`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const run = async () => {
  await prisma.$connect();
  console.log("[seed-fake-mission-enrichment] Connecté à PostgreSQL");
  const versionDisplay = promptVersion ?? (isReset ? "toutes versions" : `${CURRENT_PROMPT_VERSION} (défaut)`);
  console.log(`[seed-fake-mission-enrichment] Options — reset: ${isReset}, limit: ${limit ?? "all"}, publisher: ${publisherId ?? "all"}, prompt-version: ${versionDisplay}, dry-run: ${isDryRun}`);

  if (isReset) {
    await reset();
  } else {
    await seed();
  }

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[seed-fake-mission-enrichment] Erreur fatale:", err);
  process.exit(1);
});
