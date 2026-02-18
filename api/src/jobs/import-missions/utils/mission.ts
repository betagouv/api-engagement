import he from "he";
import { convert } from "html-to-text";

import { PUBLISHER_IDS } from "../../../config";
import { AUTRE_IMAGE, DOMAIN_IMAGES } from "../../../constants/domains";
import { captureException } from "../../../error";
import { activityService } from "../../../services/activity";
import type { MissionRecord } from "../../../types/mission";
import type { PublisherRecord } from "../../../types/publisher";
import { ImportedMission, MissionXML } from "../types";
import { getAddress, getAddresses } from "./address";
import { parseBool, parseDate, parseLowercase, parseNumber, parseString, parseStringArray } from "./helpers";
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

export const parseRemote = (value: unknown): MissionRecord["remote"] => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "no";
  }
  if (["no", "non", "false", "0"].includes(normalized)) {
    return "no";
  }
  if (["possible", "yes", "oui", "true", "1"].includes(normalized)) {
    return "possible";
  }
  if (["full", "total", "100", "remote"].includes(normalized)) {
    return "full";
  }
  if (["partiel", "partielle", "hybride"].includes(normalized)) {
    return "possible";
  }
  return "no";
};

export const parseCompensationUnit = (value: unknown): MissionRecord["compensationUnit"] => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }
  if (["hour", "heure", "heures"].includes(normalized)) {
    return "hour";
  }
  if (["day", "jour", "jours"].includes(normalized)) {
    return "day";
  }
  if (["month", "mois"].includes(normalized)) {
    return "month";
  }
  if (["year", "an", "ans", "annee", "année", "années"].includes(normalized)) {
    return "year";
  }
  return null;
};

export const parseMission = (publisher: PublisherRecord, missionXML: MissionXML, missionDB: MissionRecord | null, startTime: Date): ImportedMission | null => {
  try {
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
      postedAt: parseDate(missionXML.postedAt) || parseDate(missionDB?.postedAt ?? undefined) || startTime,
      startAt: parseDate(missionXML.startAt) || parseDate(missionDB?.startAt || "") || new Date(),
      endAt: parseDate(missionXML.endAt) || null,

      activities: activityService.resolveImportedActivities(parseString(missionXML.activity)),
      domain: parseString(missionXML.domain) || "",
      schedule: parseString(missionXML.schedule),
      audience: parseStringArray(missionXML.audience) || parseStringArray(missionXML.publicBeneficiaries) || parseStringArray(missionXML.publicsBeneficiaires) || [],
      softSkills: parseStringArray(missionXML.softSkills) || parseStringArray(missionXML.soft_skills) || [],
      romeSkills: parseStringArray(missionXML.romeSkills) || [],
      requirements: parseStringArray(missionXML.requirements) || [],
      remote: parseRemote(missionXML.remote),
      reducedMobilityAccessible: parseBool(missionXML.reducedMobilityAccessible),
      closeToTransport: parseBool(missionXML.closeToTransport),
      openToMinors: parseBool(missionXML.openToMinors),
      priority: parseString(missionXML.priority) || "",
      tags: parseStringArray(missionXML.tags) || [],
      places: parseNumber(missionXML.places) || 1,
      placesStatus: missionXML.places !== undefined ? "GIVEN_BY_PARTNER" : "ATTRIBUTED_BY_API",
      snu: parseString(missionXML.snu) === "yes",
      snuPlaces: parseNumber(missionXML.snuPlaces),
      compensationAmount: parseNumber(missionXML.compensationAmount),
      compensationUnit: parseCompensationUnit(missionXML.compensationUnit),
      compensationType: parseLowercase(missionXML.compensationType as string | undefined) as MissionRecord["compensationType"],
      metadata: parseString(missionXML.metadata),
    } as ImportedMission;

    // Moderation except Service Civique (already moderated)  // Moderation except Service Civique (already moderated)
    mission.deletedAt = null;
    mission.lastSyncAt = startTime;
    mission.publisherId = publisher.id;
    mission.publisherName = publisher.name;
    mission.publisherLogo = publisher.logo || "";
    mission.publisherUrl = publisher.url || "";
    mission.updatedAt = startTime;
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
  } catch (error) {
    captureException(error, { extra: { missionXML, startTime, missionDB } });
  }
  return null;
};
