import { ASC_100_LOGO_URL, JVA_100_LOGO_URL, PUBLISHER_IDS } from "../../config";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { MissionAddress, MissionRecord } from "../../types/mission";
import { ASC_CONTRACT_TYPE, AUDIENCE_MAPPING, DOMAIN_MAPPING, GRIMPIO_PUBLISHER_ID, JVA_CONTRACT_TYPE } from "./config";
import { GrimpioJob, GrimpioPlace } from "./types";

function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING.autre;
}

function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING.any_public;
}

/**
 * Helper function to create place object from address or mission location
 */
function createPlace(address?: MissionAddress): GrimpioPlace {
  if (address && address.location?.lat && address.location?.lon) {
    return {
      latitude: address.location.lat,
      longitude: address.location.lon,
      city: address.city || "",
      country: address.country || "FR",
    };
  }
  // Default fallback
  return {
    latitude: 48.8566, // Paris coordinates
    longitude: 2.3522,
    city: "Paris",
    country: "FR",
  };
}

function getRemoteJob(remote: MissionRecord["remote"]): "none" | "total" | "partial" {
  if (remote === "full") {
    return "total";
  } else if (remote === "possible") {
    return "partial";
  }
  return "none";
}

/**
 * Format addresses for location description
 */
function formatAddressesForLocation(addresses?: MissionAddress[]): string {
  if (!addresses || addresses.length === 0) {
    return "";
  }

  const cities = addresses
    .map((addr) => addr.city)
    .filter((city) => city && city.trim())
    .filter((city, index, self) => self.indexOf(city) === index); // Remove duplicates

  return cities.join(", ");
}

/**
 * Build JVA description following the template
 */
function buildJVADescription(mission: MissionRecord): string {
  const blocks: string[] = [];
  const displayName = mission.organizationName ?? mission.publisherName ?? "";

  // Type de mission
  blocks.push(`<p><b>Type de mission : </b><strong>${displayName}</strong> vous propose une mission de bénévolat</p>`);

  // Domaine d'activité
  if (mission.domain) {
    blocks.push(`<p><b>Domaine d'activité : </b>${getDomainLabel(mission.domain)}</p>`);
  }

  // Lieu de la mission
  if (mission.remote === "full") {
    blocks.push(`<p><b>Lieu de la mission : </b>Cette mission se déroule depuis chez vous, à distance</p>`);
  } else {
    const addressesStr = formatAddressesForLocation(mission.addresses);
    if (addressesStr) {
      blocks.push(`<p><b>Lieu de la mission : </b>Cette mission se déroule à ${addressesStr}</p>`);
    }
  }

  // Présentation de la mission
  if (mission.descriptionHtml) {
    // Check if "Présentation de la mission" is already in the descriptionHtml
    const hasPresentationHeader = mission.descriptionHtml.toLowerCase().includes("présentation de la mission");
    if (!hasPresentationHeader) {
      blocks.push(`<p><b>Présentation de la mission :</b></p>`);
    }
    blocks.push(mission.descriptionHtml);
  }

  // Pré-requis (requirements as numbered list)

  blocks.push(`<p><b>Pré-requis : </b></p>
    <ol>
    <li>Etre autonome & parler français couramment</li>
    <li>Etre à l’aise pour animer des ateliers sur la forêt avec un groupe ou (très) motivé·e pour apprendre</li>
    <li>Avoir envie de faire découvrir l'atelier Ma Forêt est Vivante ! et de vulgariser des connaissances</li>
    </ol>`);

  // Public accompagné durant la mission
  if (mission.audience && Array.isArray(mission.audience) && mission.audience.length > 0) {
    blocks.push(`<p><b>Public accompagné durant la mission : </b></p>`);
    const audienceLabels = mission.audience.map((aud) => getAudienceLabel(aud)).join(" - ");
    blocks.push(`<p>${audienceLabels}</p>`);
  }

  // Durée de la mission
  if (mission.schedule) {
    blocks.push(`<p><b>Durée de la mission : </b>${mission.schedule}</p>`);
  }

  // Âge minimum
  if (mission.openToMinors === "no") {
    blocks.push(`<p><b>Âge minimum : </b>18 ans minimum</p>`);
  }

  return blocks.join("\n");
}

/**
 * Format compensation for display
 */
function formatCompensation(amount: number | null, unit: string | null, type: string | null): string {
  if (!amount || !unit || !type) {
    return "";
  }

  const unitLabel = unit === "hour" ? "heure" : unit === "day" ? "jour" : unit === "month" ? "mois" : unit;
  const typeLabel = type === "gross" ? "brut" : type === "net" ? "net" : "";

  return `${amount}€ par ${unitLabel}${typeLabel ? ` (${typeLabel})` : ""}`;
}

/**
 * Format duration for display
 */
function formatDuration(duration: number | null, schedule: string | null | undefined): string {
  if (duration && schedule) {
    return `La mission dure ${duration} mois sur un rythme hebdomadaire de ${schedule}`;
  } else if (duration) {
    return `La mission dure ${duration} mois`;
  } else if (schedule) {
    return `Rythme hebdomadaire de ${schedule}`;
  }
  return "";
}

/**
 * Build ASC description following the template
 */
function buildASCDescription(mission: MissionRecord): string {
  const blocks: string[] = [];
  const displayName = mission.organizationName ?? mission.publisherName ?? "";

  // Type de mission
  blocks.push(`<p><b>Type de mission : </b><strong>${displayName}</strong> vous propose une mission de Service Civique.</p>`);

  // Âge requis
  let ageRequirement = "Le Service Civique est un dispositif ouvert aux personnes de 16 à 25 ans élargie à 30 ans en situation de handicap, sans condition de diplôme.";
  if (mission.openToMinors === "no") {
    ageRequirement += " <strong>Cette mission n'est cependant pas accessible aux mineurs.</strong>";
  }
  blocks.push(`<p><b>Âge requis :</b> ${ageRequirement}</p>`);

  // Domaine d'activité
  if (mission.domain) {
    blocks.push(`<p><b>Domaine d'activité : </b>${getDomainLabel(mission.domain)}</p>`);
  }

  // Présentation de la mission
  // Use description field which should contain the structured content
  // The description field should already contain sections like:
  // - EN QUELQUES MOTS
  // - VOTRE MISSION DE SERVICE CIVIQUE (with Objectifs, Actions, Capacité d'initiative)
  // - VOTRE ENVIRONNEMENT (with Formation, Tutorat)
  if (mission.description) {
    // Check if "Présentation de la mission" is already in the description
    const hasPresentationHeader = mission.description.toLowerCase().includes("présentation de la mission");
    if (!hasPresentationHeader) {
      blocks.push(`<p><b>Présentation de la mission :</b></p>`);
    }
    // Use description as-is, it should already be formatted
    blocks.push(mission.description);
  } else if (mission.descriptionHtml) {
    // Check if "Présentation de la mission" is already in the descriptionHtml
    const hasPresentationHeader = mission.descriptionHtml.toLowerCase().includes("présentation de la mission");
    if (!hasPresentationHeader) {
      blocks.push(`<p><b>Présentation de la mission :</b></p>`);
    }
    // Fallback to descriptionHtml if description is not available
    blocks.push(mission.descriptionHtml);
  }

  // Public accompagné durant la mission
  if (mission.audience && Array.isArray(mission.audience) && mission.audience.length > 0) {
    blocks.push(`<p><b>Public accompagné durant la mission : </b></p>`);
    const audienceLabels = mission.audience.map((aud) => getAudienceLabel(aud)).join(" - ");
    blocks.push(`<p>${audienceLabels}</p>`);
  }

  // Durée et rythme de la mission
  const durationText = formatDuration(mission.duration, mission.schedule);
  if (durationText) {
    blocks.push(`<p><b>Durée et rythme de la mission :</b></p>`);
    blocks.push(`<p>${durationText}</p>`);
  }

  // Indemnisation
  const compensationText = formatCompensation(mission.compensationAmount, mission.compensationUnit, mission.compensationType);
  if (compensationText) {
    blocks.push(`<p><b>Indemnisation :</b></p>`);
    blocks.push(`<p>Cette mission est indemnisée à hauteur de ${compensationText}</p>`);
  }

  return blocks.join("\n");
}

/**
 * Format JVA mission to Grimpio Job
 * Creates one job per address location
 *
 * @param mission - JVA Mission to format
 * @returns GrimpioJob[] - Array of jobs (one per address)
 */
export function missionToGrimpioJobJVA(mission: MissionRecord): GrimpioJob {
  // Build description following JVA template
  const description = buildJVADescription(mission);
  const enterpriseName = mission.organizationName ?? mission.publisherName ?? "";

  // Base job data for JVA
  const baseJob: GrimpioJob = {
    title: `Bénévolat - ${mission.title}`,
    url: getMissionTrackedApplicationUrl(mission, GRIMPIO_PUBLISHER_ID),
    contractType: JVA_CONTRACT_TYPE,
    enterpriseName,
    description,
    enterpriseIndustry: "Association ONG",
    externalId: mission.clientId,
    logo: JVA_100_LOGO_URL,
    remoteJob: getRemoteJob(mission.remote),
    annualGrossSalary: "", // N/A for JVA
    duration: mission.schedule || "",
    attachment: "", // N/A for JVA
    levels: "", // N/A for JVA
    email: "", // N/A for JVA
    startingDate: mission.startAt ? new Date(mission.startAt).toISOString() : "",
    place: createPlace(mission.addresses?.[0]),
  };

  return baseJob;
}

/**
 * Format ASC (Service Civique) mission to Grimpio Job
 * Creates one job per address location
 *
 * @param mission - ASC Mission to format
 * @returns GrimpioJob[] - Array of jobs (one per address)
 */
export function missionToGrimpioJobASC(mission: MissionRecord): GrimpioJob {
  // Build description following ASC template
  const description = buildASCDescription(mission);
  const enterpriseName = mission.organizationName ?? mission.publisherName ?? "";

  // Base job data for ASC
  const baseJob: GrimpioJob = {
    title: `Service Civique - ${mission.title}`,
    url: getMissionTrackedApplicationUrl(mission, GRIMPIO_PUBLISHER_ID),
    contractType: ASC_CONTRACT_TYPE,
    enterpriseName,
    description,
    enterpriseIndustry: "Association - ONG",
    externalId: mission.clientId,
    logo: ASC_100_LOGO_URL,
    remoteJob: getRemoteJob(mission.remote),
    annualGrossSalary: "", // N/A for ASC
    duration: mission.schedule || "",
    attachment: "", // N/A for ASC
    levels: "", // N/A for ASC
    email: "", // N/A for ASC
    startingDate: mission.startAt ? new Date(mission.startAt).toISOString() : "",
    place: createPlace(mission.addresses?.[0]),
  };

  return baseJob;
}

/**
 * Format mission to Grimpio Job
 * Routes to appropriate function based on publisher
 *
 * @param mission - Mission to format
 * @returns GrimpioJob[] - Array of jobs (one per address)
 */
export function missionToGrimpioJob(mission: MissionRecord): GrimpioJob {
  const isJVA = mission.publisherId === PUBLISHER_IDS.JEVEUXAIDER;

  if (isJVA) {
    return missionToGrimpioJobJVA(mission);
  } else {
    return missionToGrimpioJobASC(mission);
  }
}
