/**
 * Crée (ou met à jour) 1 mission SPV par département SDIS.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions-sdis/create-spv-missions.ts --env <prod|staging|local> [--dry-run]
 */

import dotenv from "dotenv";

dotenv.config();

import { readFileSync } from "fs";
import { join } from "path";

import { prisma } from "@/db/postgres";
import { DESCRIPTION_SPV, SDIS_DATA, type SdisEntry } from "./data";
import { findPublisherForDept } from "./publisher";

type Address = { street: string; postalCode: string; city: string; departmentCode: string };

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function loadAddresses(): Map<string, Address[]> {
  const lines = readFileSync(join(__dirname, "addresses.csv"), "utf-8").trim().split("\n").slice(1);
  const map = new Map<string, Address[]>();
  for (const line of lines) {
    const cols = parseCsvLine(line);
    const [dept, , street, postalCode, city] = cols.map((v) => v.trim());
    if (!dept || !city || !postalCode) continue;
    const list = map.get(dept) ?? [];
    list.push({ street, postalCode, city, departmentCode: dept });
    map.set(dept, list);
  }
  return map;
}

const API_URLS: Record<string, string> = {
  prod: "https://api.api-engagement.beta.gouv.fr",
  sandbox: "https://api.bac-a-sable.api-engagement.beta.gouv.fr",
  local: "http://localhost:4000",
};

function buildMissionPayload(entry: SdisEntry, addresses: Map<string, Address[]>) {
  const deptAddresses = addresses.get(entry.dept) ?? [];
  return {
    clientId: `spv-sdis-${entry.dept.toLowerCase()}`,
    title: "Je deviens sapeur-pompier volontaire près de chez moi",
    description: DESCRIPTION_SPV,
    type: "volontariat_sapeurs_pompiers",
    domain: "prevention-protection",
    activities: ["secourisme", "Secours, Aide", "secours-et-soutien"],
    tags: ["Sapeurs-pompiers", "Secours", "Sécurité civile", "Engagement", "incendie", "urgence"],
    audience: ["Tous publics"],
    softSkills: ["Travail en équipe", "Communication orale", "Sang-froid"],
    requirements: ["Avoir au moins 16 ans", "Être apte médicalement", "Résider ou travailler près d'un centre de secours", "Suivre une formation initiale"],
    schedule: "Flexible (quelques heures par semaine selon disponibilités)",
    places: 1,
    remote: "no",
    openToMinors: false,
    reducedMobilityAccessible: false,
    compensationAmount: 0,
    compensationAmountMax: 13,
    compensationUnit: "hour",
    compensationType: "gross",
    applicationUrl: entry.applicationUrl,
    organizationName: entry.organizationName,
    organizationUrl: entry.organizationUrl,
    organizationDescription: "Le SDIS est chargé des missions de secours et d'incendie dans le département.",
    ...(deptAddresses.length > 0 ? { addresses: deptAddresses } : {}),
  };
}

async function run() {
  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] ?? args[args.indexOf("--env") + 1];
  const isDryRun = args.includes("--dry-run");
  const env = envArg ?? "local";

  if (!API_URLS[env]) {
    console.error(`Environnement inconnu : "${env}". Valeurs possibles : ${Object.keys(API_URLS).join(", ")}`);
    process.exit(1);
  }

  const apiBaseUrl = API_URLS[env];
  const addresses = loadAddresses();
  console.log(`\n🚒  Création de missions SPV — env: ${env}${isDryRun ? " [DRY RUN]" : ""}`);
  console.log(`📡  API : ${apiBaseUrl}`);
  console.log(`🗺️  ${[...addresses.values()].reduce((n, a) => n + a.length, 0)} adresses chargées pour ${addresses.size} départements\n`);

  const publishers = await prisma.publisher.findMany({
    where: { isAnnonceur: true, deletedAt: null },
    select: { id: true, name: true, apikey: true },
  });
  console.log(`📋  ${publishers.length} publishers annonceurs trouvés en DB\n`);

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const entry of SDIS_DATA) {
    const clientId = `spv-sdis-${entry.dept.toLowerCase()}`;
    const publisher = findPublisherForDept(publishers, entry.dept);

    if (!publisher) {
      console.warn(`⚠️  [${entry.dept}] Publisher introuvable pour "${entry.organizationName}" — skippé`);
      stats.skipped++;
      continue;
    }

    if (!publisher.apikey) {
      console.warn(`   ⚠️  [${entry.dept}] Publisher "${publisher.name}" sans API key — exécuter update-sdis-publishers.ts d'abord`);
      stats.skipped++;
      continue;
    }

    const existing = await prisma.mission.findFirst({
      where: { clientId, publisherId: publisher.id, deletedAt: null },
      select: { id: true },
    });

    const method = existing ? "PUT" : "POST";
    const url = existing ? `${apiBaseUrl}/v2/mission/${clientId}` : `${apiBaseUrl}/v2/mission`;

    console.log(`${method === "POST" ? "➕" : "🔄"} [${entry.dept}] ${entry.organizationName} → ${method} ${url}`);

    if (isDryRun) {
      console.log(`   Payload : clientId=${clientId}, publisher=${publisher.name} (${publisher.id})`);
      method === "POST" ? stats.created++ : stats.updated++;
      continue;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-api-key": publisher.apikey },
        body: JSON.stringify(buildMissionPayload(entry, addresses)),
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
  console.log(`✅ Créées        : ${stats.created}`);
  console.log(`🔄 Mises à jour : ${stats.updated}`);
  console.log(`⏭️  Skippées     : ${stats.skipped}`);
  console.log(`❌ Erreurs       : ${stats.errors}`);
  console.log("──────────────────────────────────────────\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
