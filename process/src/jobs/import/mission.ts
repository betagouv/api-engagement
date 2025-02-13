import he from "he";
import { convert } from "html-to-text";

import { COUNTRIES } from "../../constants/countries";
import { DOMAINS } from "../../constants/domains";
import { Mission, MissionXML, Publisher } from "../../types";
import { getAddress, getAddresses } from "./utils/address";

const parseString = (value: string | undefined) => {
  if (!value) return "";
  return String(value);
};

const getImageDomain = (domain: string, title: string) => {
  const StringToInt = (str: string = "", len: number) => {
    let total = 0;
    for (let i = 0; i < str.length; i++) total += str[i].charCodeAt(0);
    return (total % len) + 1;
  };
  if (domain === "education") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/2_${StringToInt(title, 3)}.jpg`;
  if (domain === "sante") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/3_${StringToInt(title, 3)}.jpg`;
  if (domain === "environnement") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/4_${StringToInt(title, 3)}.jpg`;
  if (domain === "solidarite-insertion") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/6_${StringToInt(title, 3)}.jpg`;
  if (domain === "sport") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/7_${StringToInt(title, 3)}.jpg`;
  if (domain === "prevention-protection") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/8_${StringToInt(title, 3)}.jpg`;
  if (domain === "mémoire et citoyenneté") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/9_${StringToInt(title, 3)}.jpg`;
  if (domain === "culture-loisirs") return `https://apicivique.s3.eu-west-3.amazonaws.com/missions/11_${StringToInt(title, 3)}.jpg`;
  return "https://apicivique.s3.eu-west-3.amazonaws.com/missions/6_2.jpg";
};

const getMonthDifference = (startDate: Date, endDate: Date) => {
  const d = endDate.getMonth() - startDate.getMonth() + 12 * (endDate.getFullYear() - startDate.getFullYear());
  if (isNaN(d)) return undefined;
  else return d;
};

const hasEncodageIssue = (str = "") => {
  return str.indexOf("&#") !== -1;
};

const getModeration = (mission: Mission) => {
  let statusComment = "";
  if (!mission.title || mission.title === " ") statusComment = "Titre manquant";
  if (hasEncodageIssue(mission.title)) statusComment = "Problème d'encodage dans le titre";
  if ((mission.title || "").split(" ").length === 1) statusComment = "Le titre est trop court (1 seul mot)";
  if (!mission.clientId) statusComment = "ClientId manquant";
  if (!mission.description) statusComment = "Description manquante";
  if (hasEncodageIssue(mission.description)) statusComment = "Problème d'encodage dans la description";
  if ((mission.description || "").length < 300) statusComment = "La description est trop courte (moins de 300 caractères)";
  if ((mission.description || "").length > 20000) {
    mission.description = mission.description.substring(0, 20000);
    statusComment = "La description est trop longue (plus de 20000 caractères)";
  }
  if (!mission.applicationUrl) statusComment = "URL de candidature manquant";
  if (mission.country && !COUNTRIES.includes(mission.country)) statusComment = `Pays non valide : "${mission.country}"`;
  if (mission.remote && !["no", "possible", "full"].includes(mission.remote)) statusComment = "Valeur remote non valide (no, possible ou full)";
  if (mission.places && mission.places <= 0) statusComment = "Nombre de places invalide (doit être supérieur à 0)";
  // if (mission.activity && !ACTIVITIES.includes(mission.activity)) statusComment =  "Activity is not valid";
  if (mission.domain && !DOMAINS.includes(mission.domain)) statusComment = `Domaine non valide : "${mission.domain}"`;
  if (hasEncodageIssue(mission.organizationName)) statusComment = "Problème d'encodage dans le nom de l'organisation";

  mission.statusCode = statusComment ? "REFUSED" : "ACCEPTED";
  mission.statusComment = statusComment || "";
};

const parseBool = (value: string | undefined) => {
  if (!value || value === "no") return "no";
  return "yes";
};

const parseDate = (value: string | undefined) => {
  if (!value) return null;
  return new Date(value);
};

const parseNumber = (value: number | string | undefined) => {
  if (!value) return null;
  if (isNaN(Number(value))) return null;
  return Number(value);
};

const parseArray = (value: string | { value: string[] | string } | undefined) => {
  if (!value) return undefined;
  if (typeof value === "object") return Array.isArray(value.value) ? value.value : [value.value];
  if (Array.isArray(value)) return value;
  if (value.includes(",")) return value.split(",").map((i) => i.trim());
  return [value];
};

export const buildMission = (publisher: Publisher, missionXML: MissionXML) => {
  const mission = {
    title: he.decode(missionXML.title),
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
    audience: parseArray(missionXML.audience) || parseArray(missionXML.publicBeneficiaries) || [],
    soft_skills: parseArray(missionXML.soft_skills) || [],
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
    organizationName: parseString(he.decode(missionXML.organizationName)),
    organizationRNA: parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna) || "",
    organizationSiren: parseString(missionXML.organizationSiren) || missionXML.organizationSiren || "",
    organizationUrl: parseString(missionXML.organizationUrl),
    organizationLogo: parseString(missionXML.organizationLogo || ""),
    organizationDescription: parseString(missionXML.organizationDescription),
    organizationClientId: parseString(missionXML.organizationId),
    organizationStatusJuridique: parseString(missionXML.organizationStatusJuridique) || "",
    organizationType: parseString(missionXML.organizationType) || "",
    organizationActions: parseArray(missionXML.keyActions) || [],
    organizationFullAddress: parseString(missionXML.organizationFullAddress),
    organizationPostCode: parseString(missionXML.organizationPostCode),
    organizationCity: parseString(missionXML.organizationCity),
    organizationBeneficiaries: parseArray(missionXML.organizationBeneficiaries || missionXML.organizationBeneficiaires || missionXML.publicBeneficiaries) || [],
    organizationReseaux: parseArray(missionXML.organizationReseaux) || [],
  } as Mission;

  mission.domainLogo = missionXML.image || getImageDomain(mission.domain, mission.title);

  // Address
  if (missionXML.addresses && Array.isArray(missionXML.addresses) && missionXML.addresses.length > 0) {
    getAddresses(mission, missionXML);
  } else {
    getAddress(mission, missionXML);
  }

  // Moderation except Service Civique (already moderated)
  mission.statusComment = "";
  mission.statusCode = "ACCEPTED";
  if (publisher._id.toString() !== "5f99dbe75eb1ad767733b206") getModeration(mission);

  // SPECIFIC CASE
  if (!mission.publisherLogo) mission.publisherLogo = ""; // Publisher without logo

  // Dirty dirty hack for afev to get Joe happy
  if (missionXML.organizationName === "Afev") {
    mission.description = mission.description.replace(/(\r\n|\n|\r)/gm, " ");
  }

  // Dirty dirty hack for j'agis pour la nature
  if (publisher._id.toString() === "5f59305b6c7ea514150a818e") {
    const index = mission.description.indexOf("MODALITÉS D'INSCRIPTION");
    if (index !== -1) {
      mission.description = mission.description.substring(0, index); // remove stuff
    }
    mission.description = mission.description.replace(/\n{2,}/g, "\n\n"); //remove spaces
    mission.description = mission.description.replace(/(?<=•)((.|\n)*)(?=-)/g, ""); // dot and -
    mission.description = mission.description.replace(/•-/g, "•"); // dot and -
  }

  // Dirty dirty hack for Prevention routiere
  if (publisher._id.toString() === "619fab857d373e07aea8be1e") {
    mission.domain = "prevention-protection";
  }

  // Dirty dirty hack for service civique
  if (publisher._id.toString() === "5f99dbe75eb1ad767733b206") {
    if (missionXML.parentOrganizationName) {
      mission.organizationReseaux = Array.isArray(missionXML.parentOrganizationName) ? missionXML.parentOrganizationName : [missionXML.parentOrganizationName];
    } else {
      mission.organizationReseaux = [missionXML.organizationName];
    }
    let domain_original = "";
    if (missionXML.domain === "solidarite-insertion") domain_original = "Solidarité";
    if (missionXML.domain === "education") domain_original = "Éducation pour tous";
    if (missionXML.domain === "culture-loisirs") domain_original = "Culture et loisirs";
    if (missionXML.domain === "environnement") domain_original = "Environnement";
    if (missionXML.domain === "sport") domain_original = "Sport";
    if (missionXML.domain === "vivre-ensemble") domain_original = "Mémoire et citoyenneté";
    if (missionXML.domain === "sante") domain_original = "Santé";
    if (missionXML.domain === "humanitaire") domain_original = "Développement international et aide humanitaire";
    if (missionXML.domain === "autre") domain_original = "Interventions d'urgence en cas de crise";
    mission.domainOriginal = domain_original;
  }

  return mission;
};
