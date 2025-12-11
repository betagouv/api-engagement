import he from "he";
import { convert } from "html-to-text";

import { PUBLISHER_IDS } from "../../../config";
import { AUTRE_IMAGE, DOMAIN_IMAGES } from "../../../constants/domains";
import { captureException } from "../../../error";
import { missionService } from "../../../services/mission";
import type { MissionRecord } from "../../../types/mission";
import type { PublisherRecord } from "../../../types/publisher";
import { ImportedMission, MissionXML } from "../types";
import { getAddress, getAddresses } from "./address";
import { getModeration } from "./moderation";

const getImageDomain = (domain: string) => {
  const number = Number(new Date().getTime().toString().slice(-1)) % 3;
  if (domain === "animaux") {
    return DOMAIN_IMAGES.animaux[number];
  }
  if (domain === "benevolat-competences") {
    return DOMAIN_IMAGES["benevolat-competences"][number];
  }
  if (domain === "culture-loisirs") {
    return DOMAIN_IMAGES["culture-loisirs"][number];
  }
  if (domain === "education") {
    return DOMAIN_IMAGES.education[number];
  }
  if (domain === "emploi") {
    return DOMAIN_IMAGES.emploi[number];
  }
  if (domain === "environnement") {
    return DOMAIN_IMAGES.environnement[number];
  }
  if (domain === "humanitaire") {
    return DOMAIN_IMAGES.humanitaire[number];
  }
  if (domain === "memoire-et-citoyennete") {
    return DOMAIN_IMAGES["memoire-et-citoyennete"][number];
  }
  if (domain === "prevention-protection") {
    return DOMAIN_IMAGES["prevention-protection"][number];
  }
  if (domain === "sante") {
    return DOMAIN_IMAGES.sante[number];
  }
  if (domain === "solidarite-insertion") {
    return DOMAIN_IMAGES["solidarite-insertion"][number];
  }
  if (domain === "sport") {
    return DOMAIN_IMAGES.sport[number];
  }
  return AUTRE_IMAGE;
};

const getMonthDifference = (startDate: Date, endDate: Date) => {
  const d = endDate.getMonth() - startDate.getMonth() + 12 * (endDate.getFullYear() - startDate.getFullYear());
  if (isNaN(d)) {
    return null;
  } else {
    return d;
  }
};

const parseString = (value: string | undefined) => {
  if (!value) {
    return "";
  }
  return String(value);
};

const parseBool = (value: string | boolean | undefined | null) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["yes", "true", "1"].includes(normalized);
};

const parseDate = (value: string | Date | undefined) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const hasTimezoneDesignator = /[zZ]$/.test(trimmed) || /[+\-]\d{2}:?\d{2}$/.test(trimmed);

    if (!hasTimezoneDesignator) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes(), parsed.getSeconds(), parsed.getMilliseconds()));
    }
  }

  return parsed;
};

const parseNumber = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (isNaN(Number(value))) {
    return null;
  }
  return Number(value);
};

const parseArray = (value: string | { value: string[] | string } | undefined, includeSpace = false) => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "object") {
    return Array.isArray(value.value) ? value.value : [value.value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value.includes(",")) {
    return value.split(",").map((i) => i.trim());
  }
  if (includeSpace && value.includes(" ")) {
    return value.split(" ").map((i) => i.trim());
  }
  return [value];
};

const parseLowercase = (value: string | undefined) => {
  const parsed = parseString(value);
  return parsed ? parsed.toLowerCase() : null;
};

const parseMission = (publisher: PublisherRecord, missionXML: MissionXML, missionDB: MissionRecord | null): ImportedMission => {
  const organizationLogo = parseString(missionXML.organizationLogo);

  const mission = {
    title: he.decode(missionXML.title),
    type: publisher.missionType,
    description: convert(he.decode(missionXML.description || ""), {
      preserveNewlines: true,
      selectors: [{ selector: "ul", options: { itemPrefix: " • " } }],
    }),
    descriptionHtml: parseString(missionXML.description) || "",
    clientId: parseString(missionXML.clientId),
    applicationUrl: missionXML.applicationUrl || "",
    postedAt: parseDate(missionXML.postedAt) || new Date(),
    startAt: parseDate(missionXML.startAt) || parseDate(missionDB?.startAt || "") || new Date(),
    endAt: parseDate(missionXML.endAt) || null,

    activity: parseString(missionXML.activity) || "",
    domain: parseString(missionXML.domain) || "",
    schedule: parseString(missionXML.schedule),
    audience: parseArray(missionXML.audience, true) || parseArray(missionXML.publicBeneficiaries, true) || [],
    softSkills: parseArray(missionXML.softSkills, true) || parseArray(missionXML.soft_skills, true) || [],
    romeSkills: parseArray(missionXML.romeSkills, true) || [],
    requirements: parseArray(missionXML.requirements, true) || [],
    remote: parseString(missionXML.remote) || "no",
    reducedMobilityAccessible: parseBool(missionXML.reducedMobilityAccessible),
    closeToTransport: parseBool(missionXML.closeToTransport),
    openToMinors: parseBool(missionXML.openToMinors),
    priority: parseString(missionXML.priority) || "",
    tags: parseArray(missionXML.tags) || [],
    places: parseNumber(missionXML.places) || 1,
    placesStatus: missionXML.places !== undefined ? "GIVEN_BY_PARTNER" : "ATTRIBUTED_BY_API",
    snu: parseString(missionXML.snu) === "yes",
    snuPlaces: parseNumber(missionXML.snuPlaces),
    compensationAmount: parseNumber(missionXML.compensationAmount),
    compensationUnit: parseLowercase(missionXML.compensationUnit as string | undefined) as MissionRecord["compensationUnit"],
    compensationType: parseLowercase(missionXML.compensationType as string | undefined) as MissionRecord["compensationType"],
    metadata: parseString(missionXML.metadata),
    organizationName: parseString(missionXML.organizationName),
    organizationRNA: parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna) || "",
    organizationSiren: parseString(missionXML.organizationSiren) || missionXML.organizationSiren || "",
    organizationUrl: parseString(missionXML.organizationUrl),
    organizationLogo: organizationLogo || publisher.defaultMissionLogo || "",
    organizationDescription: parseString(missionXML.organizationDescription),
    organizationClientId: parseString(missionXML.organizationClientId) || parseString(missionXML.organizationId),
    organizationStatusJuridique: parseString(missionXML.organizationStatusJuridique) || "",
    organizationType: parseString(missionXML.organizationType) || "",
    organizationActions: parseArray(missionXML.keyActions, true) || [],
    organizationFullAddress: parseString(missionXML.organizationFullAddress),
    organizationPostCode: parseString(missionXML.organizationPostCode),
    organizationCity: parseString(missionXML.organizationCity),
    organizationBeneficiaries: parseArray(missionXML.organizationBeneficiaries || missionXML.organizationBeneficiaires || missionXML.publicBeneficiaries, true) || [],
    organizationReseaux: parseArray(missionXML.organizationReseaux, true) || [],
  } as ImportedMission;

  // Moderation except Service Civique (already moderated)  // Moderation except Service Civique (already moderated)
  mission.statusComment = "";
  mission.statusCode = "ACCEPTED";
  mission.duration = mission.endAt ? getMonthDifference(new Date(mission.startAt || ""), new Date(mission.endAt || "")) : null;

  if (publisher.id !== PUBLISHER_IDS.SERVICE_CIVIQUE) {
    getModeration(mission);
  }
  if (!mission.statusComment) {
    mission.statusComment = null as any;
  }

  if (mission.domain === "mémoire et citoyenneté") {
    mission.domain = "memoire-et-citoyennete";
  }
  mission.domainLogo = missionXML.image || missionDB?.domainLogo || getImageDomain(mission.domain || "");

  // Address
  if (missionXML.addresses && Array.isArray(missionXML.addresses) && missionXML.addresses.length > 0) {
    getAddresses(mission, missionXML);
  } else {
    getAddress(mission, missionXML);
  }

  if (missionDB) {
    mission._id = (missionDB as any)._id || (missionDB as any).id;
    mission.createdAt = missionDB.createdAt;
  }

  // Dirty dirty hack for Prevention routiere
  if (publisher.id === PUBLISHER_IDS.PREVENTION_ROUTIERE) {
    mission.domain = "prevention-protection";
  }

  // Dirty dirty hack for service civique
  if (publisher.id === PUBLISHER_IDS.SERVICE_CIVIQUE) {
    if (missionXML.parentOrganizationName) {
      mission.organizationReseaux = Array.isArray(missionXML.parentOrganizationName) ? missionXML.parentOrganizationName : [missionXML.parentOrganizationName];
    } else {
      mission.organizationReseaux = [missionXML.organizationName];
    }
    let domainOriginal = "";
    if (missionXML.domain === "solidarite-insertion") {
      domainOriginal = "Solidarité";
    }
    if (missionXML.domain === "education") {
      domainOriginal = "Éducation pour tous";
    }
    if (missionXML.domain === "culture-loisirs") {
      domainOriginal = "Culture et loisirs";
    }
    if (missionXML.domain === "environnement") {
      domainOriginal = "Environnement";
    }
    if (missionXML.domain === "sport") {
      domainOriginal = "Sport";
    }
    if (missionXML.domain === "vivre-ensemble") {
      domainOriginal = "Mémoire et citoyenneté";
    }
    if (missionXML.domain === "sante") {
      domainOriginal = "Santé";
    }
    if (missionXML.domain === "humanitaire") {
      domainOriginal = "Développement international et aide humanitaire";
    }
    if (missionXML.domain === "autre") {
      domainOriginal = "Interventions d'urgence en cas de crise";
    }
    mission.domainOriginal = domainOriginal;
  }

  return mission;
};

export const buildData = async (startTime: Date, publisher: PublisherRecord, missionXML: MissionXML) => {
  try {
    const clientId = missionXML.clientId?.toString();
    if (!clientId) {
      throw new Error("Missing clientId");
    }

    const missionDB = await missionService.findMissionByClientAndPublisher(clientId, publisher.id);

    const mission = parseMission(publisher, { ...missionXML, clientId }, (missionDB as any) || null);

    mission.deletedAt = null;
    mission.lastSyncAt = startTime;
    mission.publisherId = publisher.id;
    mission.publisherName = publisher.name;
    mission.publisherLogo = publisher.logo || "";
    mission.publisherUrl = publisher.url || "";
    mission.updatedAt = startTime;

    return mission;
  } catch (error) {
    captureException(error, `Error while parsing mission ${missionXML.clientId}`);
  }
};
