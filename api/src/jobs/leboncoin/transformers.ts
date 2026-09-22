import { PUBLISHER_IDS } from "@/config";
import {
  ACTIVITY_OCCUPATION,
  DEFAULT_BUSINESS_SECTOR,
  DEPARTMENTS,
  DOMAIN_BUSINESS_SECTOR,
  LEBONCOIN_JVA_USER_ID,
  LEBONCOIN_SC_USER_ID,
  LEBONCOIN_SPV_USER_ID,
} from "@/jobs/leboncoin/config";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { buildScTitle, stripHtml, truncate, truncateAtWord } from "@/jobs/leboncoin/utils";
import { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils";

export type Dispositif = "service-civique" | "spv" | "jva";

const SC_INTRO =
  "Le Service Civique permet à tous les jeunes âgés de 16 à 25 ans (jusqu'à 30 ans en situation de handicap), " +
  "de réaliser des missions indemnisées 620€ par mois pendant 6 à 12 mois dans différents domaines d'actions. " +
  "L'opportunité de se sentir utile, acquérir des compétences ou se découvrir.";

// contract_type et time.type sont du texte libre dans le flux d'exemple leboncoin.
const CONTRACT_TYPE_STAGE = "Stage";
const CONTRACT_TYPE_BENEVOLAT = "Bénévolat";
const TIME_TYPE_SC = "Temps plein ou temps partiel";
const TIME_TYPE_BENEVOLAT = "Temps partiel";
const SPV_BUSINESS_SECTOR = 7; // Services publics & administrations
const SPV_OCCUPATION = 6; // Sécurité / Défense / Gardiennage
const TITLE_MAX_LENGTH = 100;
const COMPANY_NAME_MAX_LENGTH = 50;
const CLIENT_REFERENCE_MAX_LENGTH = 30;

function businessSector(mission: MissionRecord): number {
  return DOMAIN_BUSINESS_SECTOR[mission.domain ?? ""] ?? DEFAULT_BUSINESS_SECTOR;
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

// Parties de l'offre propres à chaque dispositif ; le reste de la structure est commun.
interface OfferSpecifics {
  userId: string;
  partnerReference: string;
  clientReference?: string;
  title: string;
  description: string;
  contractType: string;
  timeType: string;
  location: { city: string; zip_code: string; country: string };
  businessSector: number;
  occupation?: number;
}

function resolveSpecifics(mission: MissionRecord, dispositif: Dispositif): OfferSpecifics | null {
  if (dispositif === "spv") {
    // Offre départementale : localisation forcée au chef-lieu (la mission a plusieurs adresses).
    const address = mission.addresses.find((a) => a.departmentCode && DEPARTMENTS[a.departmentCode]);
    const code = address?.departmentCode;
    if (!code) {
      return null;
    }
    const dept = DEPARTMENTS[code];
    return {
      userId: LEBONCOIN_SPV_USER_ID,
      partnerReference: `spv-${code}`,
      clientReference: truncate(`SPV-${code}`, CLIENT_REFERENCE_MAX_LENGTH),
      title: `Volontariat Sapeur-Pompier - ${dept.name}`,
      description: stripHtml(mission.description),
      contractType: CONTRACT_TYPE_BENEVOLAT,
      timeType: TIME_TYPE_BENEVOLAT,
      location: { city: dept.city, zip_code: dept.zipCode, country: "FR" },
      businessSector: SPV_BUSINESS_SECTOR,
      occupation: SPV_OCCUPATION,
    };
  }

  // SC et JVA : localisation issue de la première adresse avec code postal ET ville.
  const address = mission.addresses.find((a) => a.postalCode && a.city);
  if (!address || !address.postalCode || !address.city) {
    return null;
  }
  const common = {
    partnerReference: mission.id,
    clientReference: mission.clientId ? truncate(mission.clientId, CLIENT_REFERENCE_MAX_LENGTH) : undefined,
    location: { city: address.city, zip_code: address.postalCode, country: "FR" },
    businessSector: businessSector(mission),
    occupation: resolveOccupation(mission.activities),
  };

  if (dispositif === "service-civique") {
    return {
      ...common,
      userId: LEBONCOIN_SC_USER_ID,
      title: buildScTitle(mission.title),
      description: `${SC_INTRO}\n\n${mission.description ?? ""}`.trim(),
      contractType: CONTRACT_TYPE_STAGE,
      timeType: TIME_TYPE_SC,
    };
  }

  return {
    ...common,
    userId: LEBONCOIN_JVA_USER_ID,
    title: truncateAtWord(mission.title, TITLE_MAX_LENGTH),
    description: stripHtml(mission.description),
    contractType: CONTRACT_TYPE_BENEVOLAT,
    timeType: TIME_TYPE_BENEVOLAT,
  };
}

/**
 * Transforme une mission en offre leboncoin selon le dispositif (Service Civique / SPV / JVA).
 * Retourne null si la mission ne peut pas être localisée (règles propres à chaque dispositif).
 */
export function missionToOffer(mission: MissionRecord, dispositif: Dispositif): LeboncoinOffer | null {
  const specifics = resolveSpecifics(mission, dispositif);
  if (!specifics) {
    return null;
  }

  return {
    user_id: specifics.userId,
    partner_unique_reference: specifics.partnerReference,
    title: specifics.title,
    description: specifics.description,
    contract_type: specifics.contractType,
    application: { mode: "URL", contact: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LEBONCOIN) },
    location: specifics.location,
    time: { type: specifics.timeType },
    company: mission.organizationName ? truncate(mission.organizationName, COMPANY_NAME_MAX_LENGTH) : undefined,
    logo: mission.domainLogo || mission.organizationLogo || undefined,
    client_reference: specifics.clientReference,
    business_sector: specifics.businessSector,
    occupation: specifics.occupation,
  };
}
