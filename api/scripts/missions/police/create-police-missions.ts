/**
 * Crée (ou met à jour) la mission nationale "Réserve de la Police nationale" (DGPN).
 *
 * Contrairement au SPV, il s'agit d'UNE seule mission nationale portée par un
 * publisher unique (pas de déclinaison par département).
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions/police/create-police-missions.ts --env <prod|staging|local> [--dry-run]
 */

import dotenv from "dotenv";

dotenv.config();

import { prisma } from "@/db/postgres";
import { DESCRIPTION_DGPN } from "./data";

// Publisher "Police nationale (DGPN)" — cf. spec
const PUBLISHER_ID = "65f07ba338b232a6341ed1e2";

const API_URLS: Record<string, string> = {
  prod: "https://api.api-engagement.beta.gouv.fr",
  sandbox: "https://api.bac-a-sable.api-engagement.beta.gouv.fr",
  staging: "https://api.api-engagement-dev.fr",
  local: "http://localhost:3002",
};

const CLIENT_ID = "dgpn-reserve-police-nationale";

const MISSION_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQN0FUbhz90IKhzd0hf16b0xCORFc42P5E-*Uv7yLQ_xCEkR619TyWkqc5*&s=10";
const ORGANIZATION_LOGO =
  "https://www.interieur.gouv.fr/var/miomcti/storage/images/media/police-nationale/images/logo-police-nationale-500-px/270879-2-fre-FR/Logo-police-nationale-500-px.jpg";

function buildMissionPayload() {
  return {
    clientId: CLIENT_ID,
    title: "Je deviens réserviste de la Police nationale près de chez moi",
    description: DESCRIPTION_DGPN,
    type: "volontariat_reserve_operationnelle",
    domain: "service-public-defense-securite",
    activities: ["Secours, Aide", "Prévention, Sensibilisation", "accueil-de-public"],
    tags: ["Police nationale", "Réserve", "Sécurité", "Engagement", "Citoyenneté"],
    audience: ["Adultes"],
    softSkills: ["Sang-froid", "Travail en équipe", "Sens du service", "Rigueur", "Gestion de situations sensibles", "Communication avec le public"],
    romeSkills: ["300355", "404530", "300149", "300361", "300481", "300478"],
    requirements: [
      "Être âgé de 18 à 67 ans",
      "Être de nationalité française",
      "Avoir effectué la JDC",
      "Avoir un casier judiciaire compatible",
      "Être apte médicalement",
      "Réussir un entretien et une formation",
    ],
    schedule: "Quelques jours par mois selon vos disponibilités",
    places: 5000,
    remote: "local",
    openToMinors: false,
    reducedMobilityAccessible: false,
    compensationAmount: 74,
    compensationAmountMax: 119,
    compensationUnit: "day",
    compensationType: "gross",
    applicationUrl: "https://demarche.numerique.gouv.fr/dossiers/new?procedure_id=43316",
    organizationName: "Police nationale",
    organizationUrl: "https://www.police-nationale.interieur.gouv.fr",
    organizationDescription:
      "La Police nationale protège la population et garantit la sécurité publique sur l'ensemble du territoire. Les réservistes rejoignent des équipes de policiers professionnels et interviennent principalement sur le terrain, dans un cadre structuré fondé sur le sens du service, le travail en équipe et le respect des règles.",
    organizationActions: ["Secours, Aide", "Prévention, Protection, Sécurité Publique, Sensibilisation", "accueil-de-public"],
    organizationBeneficiaries: ["Tous publics"],
    ...(MISSION_IMAGE ? { image: MISSION_IMAGE } : {}),
    ...(ORGANIZATION_LOGO ? { organizationLogo: ORGANIZATION_LOGO } : {}),
  };
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
  console.log(`\n👮  Création de la mission Réserve Police nationale — env: ${env}${isDryRun ? " [DRY RUN]" : ""}`);
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

  console.log(`📋  Publisher : ${publisher.name} (${publisher.id})\n`);

  const existing = await prisma.mission.findFirst({
    where: { clientId: CLIENT_ID, publisherId: publisher.id, deletedAt: null },
    select: { id: true },
  });

  const method = existing ? "PUT" : "POST";
  const url = existing ? `${apiBaseUrl}/v2/mission/${CLIENT_ID}` : `${apiBaseUrl}/v2/mission`;

  console.log(`${method === "POST" ? "➕" : "🔄"} ${method} ${url}`);

  if (isDryRun) {
    console.log(`   Payload (dry-run) :`);
    console.log(JSON.stringify(buildMissionPayload(), null, 2));
    return;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": publisher.apikey },
      body: JSON.stringify(buildMissionPayload()),
    });

    const body = (await response.json()) as { ok: boolean; data?: { statusCode?: string; statusComment?: string } };

    if (!response.ok || !body.ok) {
      console.error(`   ❌ HTTP ${response.status} :`, JSON.stringify(body));
      process.exit(1);
    }

    const statusCode = body.data?.statusCode ?? "?";
    const comment = body.data?.statusComment ? ` (${body.data.statusComment})` : "";
    console.log(`   ✅ ${statusCode}${comment}`);
  } catch (err) {
    console.error(`   ❌ Erreur réseau :`, err);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
