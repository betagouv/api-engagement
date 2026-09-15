/**
 * Crée (ou met à jour) les offres Réserve Opérationnelle des Armées (ROC).
 *
 * Un seul publisher annonceur (ROC) porte toutes les offres ; chaque offre a
 * son propre `clientId` (cf. scripts/missions/roc/data.ts).
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions/roc/create-roc-missions.ts --env <prod|sandbox|staging|local> [--dry-run]
 */

import dotenv from "dotenv";

dotenv.config();

import { prisma } from "@/db/postgres";
import { ROC_OFFERS, ROC_TYPE } from "./data";

const PUBLISHER_ID = "65d7715cc0d3764cbed3afaf";

const API_URLS: Record<string, string> = {
  prod: "https://api.api-engagement.beta.gouv.fr",
  sandbox: "https://api.bac-a-sable.api-engagement.beta.gouv.fr",
  staging: "https://api.api-engagement-dev.fr",
  local: "http://localhost:3002",
};

function buildMissionPayload(offer: (typeof ROC_OFFERS)[number]) {
  return { ...offer, type: ROC_TYPE, postedAt: new Date().toISOString() };
}

async function run() {
  const args = process.argv.slice(2);
  const envFlagIndex = args.indexOf("--env");
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] ?? (envFlagIndex !== -1 ? args[envFlagIndex + 1] : undefined);
  const isDryRun = args.includes("--dry-run");
  const env = envArg ?? "local";

  if (!API_URLS[env]) {
    console.error(`Environnement inconnu : "${env}". Valeurs possibles : ${Object.keys(API_URLS).join(", ")}`);
    process.exit(1);
  }

  const apiBaseUrl = API_URLS[env];
  console.log(`\n🎖️  Création des offres ROC — env: ${env}${isDryRun ? " [DRY RUN]" : ""}`);
  console.log(`📡  API : ${apiBaseUrl}\n`);

  const publisher = await prisma.publisher.findFirst({
    where: { id: PUBLISHER_ID, deletedAt: null },
    select: { id: true, name: true, apikey: true, isAnnonceur: true },
  });

  if (!publisher) {
    console.error(`❌ Publisher introuvable en DB : ${PUBLISHER_ID}`);
    process.exit(1);
  }
  if (!publisher.isAnnonceur) {
    console.error(`❌ Publisher "${publisher.name}" (${publisher.id}) n'est pas un annonceur`);
    process.exit(1);
  }
  if (!publisher.apikey) {
    console.error(`❌ Publisher "${publisher.name}" (${publisher.id}) sans API key`);
    process.exit(1);
  }

  console.log(`📋  Publisher : ${publisher.name} (${publisher.id}) — ${ROC_OFFERS.length} offre(s)\n`);

  const stats = { created: 0, updated: 0, errors: 0 };

  for (const offer of ROC_OFFERS) {
    const existing = await prisma.mission.findFirst({
      where: { clientId: offer.clientId, publisherId: publisher.id, deletedAt: null },
      select: { id: true },
    });

    const method = existing ? "PUT" : "POST";
    const url = existing ? `${apiBaseUrl}/v2/mission/${offer.clientId}` : `${apiBaseUrl}/v2/mission`;

    console.log(`${method === "POST" ? "➕" : "🔄"} [${offer.clientId}] ${method} ${url}`);

    if (isDryRun) {
      console.log(`   Payload (dry-run) :`);
      console.log(JSON.stringify(buildMissionPayload(offer), null, 2));
      method === "POST" ? stats.created++ : stats.updated++;
      continue;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-api-key": publisher.apikey },
        body: JSON.stringify(buildMissionPayload(offer)),
      });

      const body = (await response.json()) as { ok: boolean; data?: { statusCode?: string; statusComment?: string } };

      if (!response.ok || !body.ok) {
        console.error(`   ❌ HTTP ${response.status} :`, JSON.stringify(body));
        stats.errors++;
      } else {
        const statusCode = body.data?.statusCode ?? "?";
        const comment = body.data?.statusComment ? ` (${body.data.statusComment})` : "";
        console.log(`   ✅ ${statusCode}${comment}`);
        method === "POST" ? stats.created++ : stats.updated++;
      }
    } catch (err) {
      console.error(`   ❌ Erreur réseau :`, err);
      stats.errors++;
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`✅ Créées       : ${stats.created}`);
  console.log(`🔄 Mises à jour : ${stats.updated}`);
  console.log(`❌ Erreurs      : ${stats.errors}`);
  console.log("──────────────────────────────────────────\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
