import he from "he";
import { convert } from "html-to-text";
import { Schema } from "mongoose";
import { isDeepStrictEqual } from "node:util";

import { PUBLISHER_IDS } from "../../../config";
import { AUTRE_IMAGE, DOMAIN_IMAGES } from "../../../constants/domains";
import { captureException } from "../../../error";
import MissionModel from "../../../models/mission";
import { Mission, Publisher } from "../../../types";
import { MissionXML } from "../types";
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
    return undefined;
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

const parseBool = (value: string | undefined) => {
  if (!value || value === "no") {
    return "no";
  }
  return "yes";
};

const parseDate = (value: string | undefined) => {
  if (!value) {
    return null;
  }
  return isNaN(new Date(value).getTime()) ? null : new Date(value);
};

const parseNumber = (value: number | string | undefined) => {
  if (!value) {
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

const parseMission = (publisher: Publisher, missionXML: MissionXML, missionDB: Mission | null) => {
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
    startAt: parseDate(missionXML.startAt) || new Date(),
    endAt: parseDate(missionXML.endAt) || null,
    duration: missionXML.endAt ? getMonthDifference(new Date(missionXML.startAt), new Date(missionXML.endAt)) : undefined,
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
    metadata: parseString(missionXML.metadata),
    organizationName: parseString(missionXML.organizationName),
    organizationRNA: parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna) || "",
    organizationSiren: parseString(missionXML.organizationSiren) || missionXML.organizationSiren || "",
    organizationUrl: parseString(missionXML.organizationUrl),
    organizationLogo: parseString(missionXML.organizationLogo || ""),
    organizationDescription: parseString(missionXML.organizationDescription),
    organizationClientId: parseString(missionXML.organizationId),
    organizationStatusJuridique: parseString(missionXML.organizationStatusJuridique) || "",
    organizationType: parseString(missionXML.organizationType) || "",
    organizationActions: parseArray(missionXML.keyActions, true) || [],
    organizationFullAddress: parseString(missionXML.organizationFullAddress),
    organizationPostCode: parseString(missionXML.organizationPostCode),
    organizationCity: parseString(missionXML.organizationCity),
    organizationBeneficiaries: parseArray(missionXML.organizationBeneficiaries || missionXML.organizationBeneficiaires || missionXML.publicBeneficiaries, true) || [],
    organizationReseaux: parseArray(missionXML.organizationReseaux, true) || [],
  } as Mission;

  // Moderation except Service Civique (already moderated)  // Moderation except Service Civique (already moderated)
  mission.statusComment = "";
  mission.statusCode = "ACCEPTED";
  if (publisher._id.toString() !== PUBLISHER_IDS.SERVICE_CIVIQUE) {
    getModeration(mission);
  }

  if (mission.domain === "mémoire et citoyenneté") {
    mission.domain = "memoire-et-citoyennete";
  }
  mission.domainLogo = missionXML.image || missionDB?.domainLogo || getImageDomain(mission.domain);

  // Address
  if (missionXML.addresses && Array.isArray(missionXML.addresses) && missionXML.addresses.length > 0) {
    getAddresses(mission, missionXML);
  } else {
    getAddress(mission, missionXML);
  }

  if (missionDB) {
    mission._id = missionDB._id as Schema.Types.ObjectId;
    mission.createdAt = missionDB.createdAt;
    mission.organizationVerificationStatus = missionDB.organizationVerificationStatus;

    if (missionDB.statusCommentHistoric && Array.isArray(missionDB.statusCommentHistoric)) {
      if (missionDB.statusCode !== mission.statusCode) {
        mission.statusCommentHistoric = [...missionDB.statusCommentHistoric, { status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
      }
    } else {
      mission.statusCommentHistoric = [{ status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
    }
  }

  // Dirty dirty hack for j'agis pour la nature
  if (publisher._id.toString() === PUBLISHER_IDS.JAGIS_POUR_LA_NATURE) {
    const index = mission.description.indexOf("MODALITÉS D'INSCRIPTION");
    if (index !== -1) {
      mission.description = mission.description.substring(0, index); // remove stuff
    }
    mission.description = mission.description.replace(/\n{2,}/g, "\n\n"); //remove spaces
    mission.description = mission.description.replace(/(?<=•)((.|\n)*)(?=-)/g, ""); // dot and -
    mission.description = mission.description.replace(/•-/g, "•"); // dot and -
  }

  // Dirty dirty hack for Prevention routiere
  if (publisher._id.toString() === PUBLISHER_IDS.PREVENTION_ROUTIERE) {
    mission.domain = "prevention-protection";
  }

  // Dirty dirty hack for service civique
  if (publisher._id.toString() === PUBLISHER_IDS.SERVICE_CIVIQUE) {
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

export const buildData = async (startTime: Date, publisher: Publisher, missionXML: MissionXML) => {
  try {
    const missionDB = await MissionModel.findOne({
      publisherId: publisher._id,
      clientId: missionXML.clientId,
    });

    const mission = parseMission(publisher, missionXML, missionDB?.toObject() || null);

    mission.deleted = false;
    mission.deletedAt = null;
    mission.lastSyncAt = startTime;
    mission.publisherId = publisher._id.toString();
    mission.publisherName = publisher.name;
    mission.publisherLogo = publisher.logo;
    mission.publisherUrl = publisher.url;
    mission.updatedAt = startTime;

    return mission;
  } catch (error) {
    captureException(error, `Error while parsing mission ${missionXML.clientId}`);
  }
};

export const missionsAreEqual = (a: any, b: any) => {
  const fields = [
    "title",
    "type",
    "description",
    "descriptionHtml",
    "clientId",
    "applicationUrl",
    "postedAt",
    "startAt",
    "endAt",
    "duration",
    "activity",
    "domain",
    "schedule",
    "audience",
    "softSkills",
    "romeSkills",
    "requirements",
    "remote",
    "reducedMobilityAccessible",
    "closeToTransport",
    "openToMinors",
    "priority",
    "tags",
    "places",
    "snu",
    "snuPlaces",
    "metadata",
    "organizationName",
    "organizationRNA",
    "organizationSiren",
    "organizationUrl",
    "organizationLogo",
    "organizationDescription",
    "organizationClientId",
    "organizationStatusJuridique",
    "organizationType",
    "organizationActions",
    "organizationFullAddress",
    "organizationPostCode",
    "organizationCity",
    "organizationBeneficiaries",
    "organizationReseaux",
    "statusComment",
    "statusCommentHistoric",
    "addresses",
    "tasks",
    "tags",
    "requirements",
    "softSkills",
    "romeSkills",
  ];

  // Check if a field is an array, based on the schema
  const isArrayField = (field: string): boolean => {
    const path = MissionModel.schema.path(field);
    return !!path && path.instance === "Array";
  };

  // Normalize mission for comparison: strip _id, arrays undefined -> [], string/number
  const normalizeMission = (val: any): any => {
    if (val === undefined) {
      return [];
    }
    if (Array.isArray(val)) {
      return val.map(normalizeMission);
    }
    if (val && typeof val === "object") {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { _id: mongoId, ...rest } = val;
      const clean: any = {};
      for (const key in rest) {
        if (Object.prototype.hasOwnProperty.call(rest, key)) {
          clean[key] = normalizeMission(rest[key]);
        }
      }
      return clean;
    }
    if (typeof val === "string" && val !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    return val;
  };

  const diffs = fields.filter((field) => {
    let aVal = a[field];
    let bVal = b[field];
    if (isArrayField(field)) {
      aVal = aVal === undefined ? [] : aVal;
      bVal = bVal === undefined ? [] : bVal;
    }
    aVal = normalizeMission(aVal);
    bVal = normalizeMission(bVal);
    return !isDeepStrictEqual(aVal, bVal);
  });

  return diffs.length === 0;
};
