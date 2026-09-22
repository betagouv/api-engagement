import { PUBLISHER_IDS } from "@/config";
import { ACTIVITY_OCCUPATION, DEFAULT_BUSINESS_SECTOR, DEPARTMENTS, DOMAIN_BUSINESS_SECTOR, LEBONCOIN_BENEVOLAT_USER_ID, LEBONCOIN_SC_USER_ID } from "@/jobs/leboncoin/config";
import { LeboncoinApplicant, LeboncoinCompany, LeboncoinOffer } from "@/jobs/leboncoin/types";
import { buildScTitle, formatDate, stripHtml, truncate, truncateAtWord } from "@/jobs/leboncoin/utils";
import { MissionAddress, MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils";

const SC_INTRO =
  "Le Service Civique permet à tous les jeunes âgés de 16 à 25 ans (jusqu'à 30 ans en situation de handicap), " +
  "de réaliser des missions indemnisées 620€ par mois pendant 6 à 12 mois dans différents domaines d'actions. " +
  "L'opportunité de se sentir utile, acquérir des compétences ou se découvrir.";

const CONTRACT_TYPE_STAGE = 6;
const CONTRACT_TYPE_BENEVOLAT = 7;
const TIME_TYPE_FULL_OR_PARTIAL = 3; // Temps plein ou partiel (Service Civique)
const TIME_TYPE_PARTIAL = 2; // Temps partiel (bénévolat)
const SPV_BUSINESS_SECTOR = 7; // Services publics & administrations
const SPV_OCCUPATION = 6; // Sécurité / Défense / Gardiennage
const APPLICANT_DEGREE = 1; // Sans diplôme
const APPLICANT_EXPERIENCE = 1; // 0 à 2 ans
const SC_MONTHLY_ALLOWANCE = 620;
const TITLE_MAX_LENGTH = 100;
const COMPANY_NAME_MAX_LENGTH = 50;
const COMPANY_URL_MAX_LENGTH = 255;
const CLIENT_REFERENCE_MAX_LENGTH = 30;

function buildApplication(mission: MissionRecord): { mode: string; contact: string } {
  return { mode: "url", contact: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LEBONCOIN) };
}

function buildCompany(mission: MissionRecord): LeboncoinCompany | undefined {
  const company: LeboncoinCompany = {};
  if (mission.organizationName) {
    company.name = truncate(mission.organizationName, COMPANY_NAME_MAX_LENGTH);
  }
  if (mission.organizationDescription) {
    company.description = stripHtml(mission.organizationDescription);
  }
  if (mission.organizationUrl) {
    company.url = truncate(mission.organizationUrl, COMPANY_URL_MAX_LENGTH);
  }
  if (mission.organizationCity) {
    company.location = { street: mission.organizationFullAddress ?? undefined, zip_code: mission.organizationPostCode ?? "", city: mission.organizationCity, country: "FR" };
  }
  return Object.keys(company).length ? company : undefined;
}

function buildApplicant(mission: MissionRecord): LeboncoinApplicant {
  const applicant: LeboncoinApplicant = { degree: APPLICANT_DEGREE, experience: APPLICANT_EXPERIENCE };
  const profile = mission.requirements.join(" ").trim();
  if (profile) {
    applicant.profile = profile;
  }
  const skills = [...mission.softSkills, ...mission.romeSkills].join(", ").trim();
  if (skills) {
    applicant.skills = skills;
  }
  return applicant;
}

/** domainLogo, sinon organizationLogo, sinon pas de tableau pictures. */
function selectPictures(mission: MissionRecord): { picture: string[] } | undefined {
  const url = mission.domainLogo || mission.organizationLogo;
  return url ? { picture: [url] } : undefined;
}

function resolveOccupation(activities: string[]): number | undefined {
  const haystack = activities.join(" ").toLowerCase();
  for (const { keywords, code } of ACTIVITY_OCCUPATION) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return code;
    }
  }
  return undefined;
}

function businessSector(mission: MissionRecord): number {
  return DOMAIN_BUSINESS_SECTOR[mission.domain ?? ""] ?? DEFAULT_BUSINESS_SECTOR;
}

/** Première adresse avec code postal ET ville (leboncoin exige zip_code + city cohérents). */
function firstLocatableAddress(mission: MissionRecord): MissionAddress | undefined {
  return mission.addresses.find((a) => a.postalCode && a.city);
}

/**
 * Offre Service Civique (rubrique Stage). Retourne null si aucune adresse n'a de code postal
 * ET de ville.
 */
export function missionToServiceCiviqueOffer(mission: MissionRecord): LeboncoinOffer | null {
  const address = firstLocatableAddress(mission);
  if (!address || !address.postalCode || !address.city) {
    return null;
  }

  const offer: LeboncoinOffer = {
    user_id: LEBONCOIN_SC_USER_ID,
    partner_unique_reference: mission.id,
    client_reference: mission.clientId ? truncate(mission.clientId, CLIENT_REFERENCE_MAX_LENGTH) : undefined,
    title: buildScTitle(mission.title),
    description: `${SC_INTRO}\n\n${mission.description ?? ""}`.trim(),
    start_date: mission.startAt ? formatDate(new Date(mission.startAt)) : undefined,
    time_type: TIME_TYPE_FULL_OR_PARTIAL,
    contract_type: CONTRACT_TYPE_STAGE,
    business_sector: businessSector(mission),
    occupation: resolveOccupation(mission.activities),
    location: { street: address.street ?? undefined, zip_code: address.postalCode, city: address.city, country: "FR" },
    salary: { min: mission.compensationAmount ?? SC_MONTHLY_ALLOWANCE, max: mission.compensationAmount ?? SC_MONTHLY_ALLOWANCE, per: mission.compensationUnit ?? "month" },
    application: buildApplication(mission),
    company: buildCompany(mission),
    applicant: buildApplicant(mission),
    pictures: selectPictures(mission),
  };

  if (mission.duration != null) {
    offer.contract_duration = { min: mission.duration, max: mission.duration, duration_type: "month" };
  }

  return offer;
}

/**
 * Offre SPV (rubrique Bénévolat), une par département. La mission (déjà unique par département)
 * a plusieurs adresses : on force la localisation au chef-lieu du département. Retourne null si
 * aucune adresse n'est rattachée à un département connu.
 */
export function missionToSpvOffer(mission: MissionRecord): LeboncoinOffer | null {
  const address = mission.addresses.find((a) => a.departmentCode && DEPARTMENTS[a.departmentCode]);
  const code = address?.departmentCode;
  if (!code) {
    return null;
  }
  const dept = DEPARTMENTS[code];

  const hasSalary = (mission.compensationAmount != null && mission.compensationAmount > 0) || (mission.compensationAmountMax != null && mission.compensationAmountMax > 0);

  return {
    user_id: LEBONCOIN_BENEVOLAT_USER_ID,
    partner_unique_reference: `spv-${code}`,
    client_reference: truncate(`SPV-${code}`, CLIENT_REFERENCE_MAX_LENGTH),
    title: `Volontariat Sapeur-Pompier - ${dept.name}`,
    description: stripHtml(mission.description),
    start_date: formatDate(new Date()),
    time_type: TIME_TYPE_PARTIAL,
    contract_type: CONTRACT_TYPE_BENEVOLAT,
    business_sector: SPV_BUSINESS_SECTOR,
    occupation: SPV_OCCUPATION,
    location: { zip_code: dept.zipCode, city: dept.city, country: "FR" },
    salary: hasSalary ? { min: mission.compensationAmount ?? undefined, max: mission.compensationAmountMax ?? undefined, per: mission.compensationUnit ?? undefined } : undefined,
    application: buildApplication(mission),
    company: buildCompany(mission),
    applicant: buildApplicant(mission),
    pictures: selectPictures(mission),
  };
}

/**
 * Offre bénévolat JeVeuxAider (rubrique Bénévolat), une par mission. Retourne null si aucune
 * adresse n'a de code postal ET de ville.
 */
export function missionToBenevolatOffer(mission: MissionRecord): LeboncoinOffer | null {
  const address = firstLocatableAddress(mission);
  if (!address || !address.postalCode || !address.city) {
    return null;
  }

  const hasSalary = mission.compensationAmount != null && mission.compensationAmount > 0;

  return {
    user_id: LEBONCOIN_BENEVOLAT_USER_ID,
    partner_unique_reference: mission.id,
    client_reference: mission.clientId ? truncate(mission.clientId, CLIENT_REFERENCE_MAX_LENGTH) : undefined,
    title: truncateAtWord(mission.title, TITLE_MAX_LENGTH),
    description: stripHtml(mission.description),
    start_date: mission.startAt ? formatDate(new Date(mission.startAt)) : undefined,
    time_type: TIME_TYPE_PARTIAL,
    contract_type: CONTRACT_TYPE_BENEVOLAT,
    business_sector: businessSector(mission),
    occupation: resolveOccupation(mission.activities),
    location: { street: address.street ?? undefined, zip_code: address.postalCode, city: address.city, country: "FR" },
    salary: hasSalary ? { min: mission.compensationAmount ?? undefined, max: mission.compensationAmountMax ?? undefined, per: mission.compensationUnit ?? undefined } : undefined,
    application: buildApplication(mission),
    company: buildCompany(mission),
    applicant: buildApplicant(mission),
    pictures: selectPictures(mission),
  };
}
