import {
  ACTIVITY_OCCUPATION,
  APPLICANT_DEGREE,
  APPLICANT_EXPERIENCE,
  CLIENT_REFERENCE_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_URL_MAX_LENGTH,
  DEFAULT_BUSINESS_SECTOR,
  DEPARTMENTS,
  DOMAIN_BUSINESS_SECTOR,
  LEBONCOIN_PUBLISHER_ID,
  LEBONCOIN_SC_USER_ID,
  LEBONCOIN_SPV_USER_ID,
  SC_CONTRACT_TYPE,
  SC_INTRO,
  SC_TIME_TYPE,
  SPV_BUSINESS_SECTOR,
  SPV_CONTRACT_TYPE,
  SPV_OCCUPATION,
  SPV_TIME_TYPE,
} from "@/jobs/leboncoin/config";
import { LeboncoinApplicant, LeboncoinCompany, LeboncoinOffer } from "@/jobs/leboncoin/types";
import { buildScTitle, formatDate, stripHtml, truncate } from "@/jobs/leboncoin/utils";
import { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils";

function buildApplication(mission: MissionRecord): { mode: string; contact: string } {
  return { mode: "url", contact: getMissionTrackedApplicationUrl(mission, LEBONCOIN_PUBLISHER_ID) };
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
    company.location = {
      street: mission.organizationFullAddress ?? undefined,
      zip_code: mission.organizationPostCode ?? "",
      city: mission.organizationCity,
      country: "FR",
    };
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

/** Règle des visuels : domainLogo, sinon organizationLogo, sinon pas de tableau pictures. */
function selectPictures(mission: MissionRecord): { picture: string[] } | undefined {
  const url = mission.domainLogo || mission.organizationLogo;
  return url ? { picture: [url] } : undefined;
}

/** Retourne le code job.occupation du premier mot-clé d'activité qui matche, sinon undefined. */
function resolveOccupation(activities: string[]): number | undefined {
  const haystack = activities.join(" ").toLowerCase();
  for (const { keywords, code } of ACTIVITY_OCCUPATION) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return code;
    }
  }
  return undefined;
}

/**
 * Offre Service Civique (rubrique Stage). Retourne null si la mission n'a pas d'adresse
 * avec code postal ET ville (leboncoin exige zip_code + city cohérents).
 */
export function missionToServiceCiviqueOffer(mission: MissionRecord): LeboncoinOffer | null {
  const address = mission.addresses.find((a) => a.postalCode && a.city);
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
    time_type: SC_TIME_TYPE,
    contract_type: SC_CONTRACT_TYPE,
    business_sector: DOMAIN_BUSINESS_SECTOR[mission.domain ?? ""] ?? DEFAULT_BUSINESS_SECTOR,
    occupation: resolveOccupation(mission.activities),
    location: { street: address.street ?? undefined, zip_code: address.postalCode, city: address.city, country: "FR" },
    salary: {
      min: mission.compensationAmount ?? 620,
      max: mission.compensationAmount ?? 620,
      per: mission.compensationUnit ?? "month",
    },
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
 * Offre SPV (rubrique Bénévolat), une par département. Retourne null si la mission n'a pas
 * d'adresse rattachée à un département connu (chef-lieu introuvable).
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
    user_id: LEBONCOIN_SPV_USER_ID,
    partner_unique_reference: `spv-${code}`,
    client_reference: truncate(`SPV-${code}`, CLIENT_REFERENCE_MAX_LENGTH),
    title: `Volontariat Sapeur-Pompier - ${dept.name}`,
    description: stripHtml(mission.description),
    start_date: formatDate(new Date()),
    time_type: SPV_TIME_TYPE,
    contract_type: SPV_CONTRACT_TYPE,
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
