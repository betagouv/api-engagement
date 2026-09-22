import { PUBLISHER_IDS } from "@/config";
import { ACTIVITY_OCCUPATION, DEFAULT_BUSINESS_SECTOR, DepartmentChefLieu, DEPARTMENTS, DOMAIN_BUSINESS_SECTOR, LEBONCOIN_USER_IDS } from "@/jobs/leboncoin/config";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { buildScTitle, stripHtml, truncate, truncateAtWord } from "@/jobs/leboncoin/utils";
import { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils";

export type Dispositif = keyof typeof LEBONCOIN_USER_IDS;

const SC_INTRO =
  "Le Service Civique permet à tous les jeunes âgés de 16 à 25 ans (jusqu'à 30 ans en situation de handicap), " +
  "de réaliser des missions indemnisées 620€ par mois pendant 6 à 12 mois dans différents domaines d'actions. " +
  "L'opportunité de se sentir utile, acquérir des compétences ou se découvrir.";

const SPV_BUSINESS_SECTOR = 7; // Services publics & administrations
const SPV_OCCUPATION = 6; // Sécurité / Défense / Gardiennage
const TITLE_MAX_LENGTH = 100;
const COMPANY_NAME_MAX_LENGTH = 50;
const CLIENT_REFERENCE_MAX_LENGTH = 30;
const REMOTE_TITLE_PREFIX = "[À distance] ";
const REMOTE_LOCATION = { city: "Paris", zip_code: "75001", country: "FR" };

/** Mission entièrement à distance (pas de lieu physique). */
function isRemote(mission: MissionRecord): boolean {
  return mission.remote === "full";
}

// Champs constants par dispositif (contract_type et time.type en texte, cf. flux d'exemple leboncoin).
const DISPOSITIF_CONFIG: Record<Dispositif, { contractType: string; timeType: string }> = {
  "service-civique": { contractType: "Stage", timeType: "Temps plein ou temps partiel" },
  spv: { contractType: "Bénévolat", timeType: "Temps partiel" },
  jva: { contractType: "Bénévolat", timeType: "Temps partiel" },
};

/** Chef-lieu du département de la mission SPV (via le departmentCode d'une adresse), ou null. */
function spvDepartment(mission: MissionRecord): (DepartmentChefLieu & { code: string }) | null {
  const address = mission.addresses.find((a) => a.departmentCode && DEPARTMENTS[a.departmentCode]);
  const code = address?.departmentCode;
  return code ? { code, ...DEPARTMENTS[code] } : null;
}

/**
 * SPV : toujours le chef-lieu du département. Mission à distance : Paris 75001.
 * Autres : la première adresse valable (avec code postal ET ville). Null si non localisable.
 */
function resolveLocation(mission: MissionRecord, dispositif: Dispositif): LeboncoinOffer["location"] | null {
  if (dispositif === "spv") {
    const dept = spvDepartment(mission);
    return dept ? { city: dept.city, zip_code: dept.zipCode, country: "FR" } : null;
  }
  if (isRemote(mission)) {
    return { ...REMOTE_LOCATION };
  }
  const address = mission.addresses.find((a) => a.postalCode && a.city);
  if (!address || !address.postalCode || !address.city) {
    return null;
  }
  return { city: address.city, zip_code: address.postalCode, country: "FR" };
}

function baseTitle(mission: MissionRecord, dispositif: Dispositif): string {
  if (dispositif === "service-civique") {
    return buildScTitle(mission.title);
  }
  if (dispositif === "spv") {
    const dept = spvDepartment(mission);
    return dept ? `Volontariat Sapeur-Pompier - ${dept.name}` : mission.title;
  }
  return mission.title;
}

/** Titre du dispositif, préfixé de "[À distance] " si la mission est entièrement à distance, ≤ 100 caractères. */
function resolveTitle(mission: MissionRecord, dispositif: Dispositif): string {
  const base = baseTitle(mission, dispositif);
  const full = isRemote(mission) ? `${REMOTE_TITLE_PREFIX}${base}` : base;
  return truncateAtWord(full, TITLE_MAX_LENGTH);
}

function resolveDescription(mission: MissionRecord, dispositif: Dispositif): string {
  if (dispositif === "service-civique") {
    return `${SC_INTRO}\n\n${mission.description ?? ""}`.trim();
  }
  return stripHtml(mission.description);
}

function resolveClientReference(mission: MissionRecord, dispositif: Dispositif): string | undefined {
  if (dispositif === "spv") {
    const dept = spvDepartment(mission);
    return dept ? truncate(`SPV-${dept.code}`, CLIENT_REFERENCE_MAX_LENGTH) : undefined;
  }
  return mission.clientId ? truncate(mission.clientId, CLIENT_REFERENCE_MAX_LENGTH) : undefined;
}

function resolveBusinessSector(mission: MissionRecord, dispositif: Dispositif): number {
  if (dispositif === "spv") {
    return SPV_BUSINESS_SECTOR;
  }
  return DOMAIN_BUSINESS_SECTOR[mission.domain ?? ""] ?? DEFAULT_BUSINESS_SECTOR;
}

function resolveOccupation(mission: MissionRecord, dispositif: Dispositif): number | undefined {
  if (dispositif === "spv") {
    return SPV_OCCUPATION;
  }
  const haystack = mission.activities.join(" ").toLowerCase();
  for (const { keywords, code } of ACTIVITY_OCCUPATION) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return code;
    }
  }
  return undefined;
}

/**
 * Transforme une mission en offre leboncoin selon le dispositif (Service Civique / SPV / JVA).
 * Retourne null si la mission ne peut pas être localisée (SPV : département inconnu ;
 * autres : première adresse sans code postal ou ville).
 */
export function missionToOffer(mission: MissionRecord, dispositif: Dispositif): LeboncoinOffer | null {
  const location = resolveLocation(mission, dispositif);
  if (!location) {
    return null;
  }

  const config = DISPOSITIF_CONFIG[dispositif];
  return {
    user_id: LEBONCOIN_USER_IDS[dispositif],
    partner_unique_reference: mission.id,
    title: resolveTitle(mission, dispositif),
    description: resolveDescription(mission, dispositif),
    contract_type: config.contractType,
    application: { mode: "URL", contact: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LEBONCOIN) },
    location,
    time: { type: config.timeType },
    company: mission.organizationName ? truncate(mission.organizationName, COMPANY_NAME_MAX_LENGTH) : undefined,
    logo: mission.domainLogo || mission.organizationLogo || undefined,
    client_reference: resolveClientReference(mission, dispositif),
    business_sector: resolveBusinessSector(mission, dispositif),
    occupation: resolveOccupation(mission, dispositif),
  };
}
