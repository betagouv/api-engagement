/**
 * Crée (ou met à jour) la mission nationale "Réserve de la Gendarmerie nationale" (DGGN).
 *
 * Il s'agit d'UNE seule mission nationale portée par un publisher unique
 * (pas de déclinaison par département).
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions/gendarmerie/create-gendarmerie-missions.ts --env <prod|sandbox|staging|local> [--dry-run]
 */

import dotenv from "dotenv";

dotenv.config();

import { prisma } from "@/db/postgres";
import { DESCRIPTION_DGGN } from "./data";

// Publisher "Gendarmerie nationale" — cf. spec
const PUBLISHER_ID = "65d770d5c0d3764cbed3ac85";

const API_URLS: Record<string, string> = {
  prod: "https://api.api-engagement.beta.gouv.fr",
  sandbox: "https://api.bac-a-sable.api-engagement.beta.gouv.fr",
  staging: "https://api.api-engagement-dev.fr",
  local: "http://localhost:3002",
};

const CLIENT_ID = "dggn-reserve-gendarmerie-nationale";

const APPLICATION_URL = "https://minotaur.gendarmerie.interieur.gouv.fr/get/contact";
const ORGANIZATION_LOGO = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Gendarmerie_nationale_logo.svg";
const MISSION_IMAGE = "https://www.devenir-gendarme.com/images/Ressourcesimage0/2123-1707207993-1_2/gendarme-reserviste.avif";

function buildMissionPayload() {
  const now = new Date().toISOString();

  return {
    clientId: CLIENT_ID,
    title: "Je deviens réserviste de la Gendarmerie nationale près de chez moi",
    description: DESCRIPTION_DGGN,
    type: "volontariat_reserve_operationnelle",
    domain: "service-public-defense-securite",
    activities: ["Sécurité", "Prévention", "Protection", "Police", "Citoyenneté", "Patrouille", "Sécurisation d'évènements", "Accueil du public", "Intervention"],
    tags: ["Gendarmerie", "Réserve", "Sécurité", "Citoyenneté", "Protection"],
    audience: ["Adultes"],
    softSkills: ["Esprit d'équipe", "Rigueur", "Sang-froid", "Sens du service", "Sens des responsabilités", "Autonomie"],
    romeSkills: ["300355", "404530", "300149", "300361", "300481", "300478"],
    requirements: ["Nationalité française", "17 à 45 ans", "JDC effectuée", "Apte physiquement"],
    schedule: "Quelques jours par mois selon vos disponibilités",
    places: 1,
    remote: "no",
    openToMinors: true,
    reducedMobilityAccessible: false,
    closeToTransport: true,
    compensationAmount: 60,
    compensationAmountMax: 130,
    compensationUnit: "day",
    compensationType: "gross",
    applicationUrl: APPLICATION_URL,
    postedAt: now,
    startAt: now,
    organizationName: "Gendarmerie nationale",
    organizationUrl: "https://www.gendarmerie.interieur.gouv.fr",
    organizationDescription: "La Gendarmerie nationale assure des missions de sécurité publique, de maintien de l'ordre et de police judiciaire sur l'ensemble du territoire.",
    organizationActions: ["Prévention", "Protection", "Sécurité publique", "Intervention", "Accueil du public"],
    organizationBeneficiaries: ["Tous publics"],
    organizationLogo: ORGANIZATION_LOGO,
    ...(MISSION_IMAGE ? { image: MISSION_IMAGE } : {}),
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
  console.log(`\n👮  Création de la mission Réserve Gendarmerie nationale — env: ${env}${isDryRun ? " [DRY RUN]" : ""}`);
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
