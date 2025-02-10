import he from "he";
import { convert } from "html-to-text";

import { DEPARTMENTS } from "../../constants/departments";
import { COUNTRIES } from "../../constants/countries";
import { DOMAINS } from "../../constants/domains";
import { Mission, MissionXML, Publisher } from "../../types";

interface AddressItem {
  address: string | undefined;
  city: string | undefined;
  postalCode: string | undefined;
  departmentName: string | undefined;
  departmentCode: string | undefined;
  region: string | undefined;
  country: string | undefined;
  location: { lon: number; lat: number } | undefined;
  geoPoint: { type: "Point"; coordinates: [number, number] } | null;
}

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

const formatPostalCode = (postalCode: string) => {
  if (!postalCode) return "";
  const postalCodeString = postalCode;
  if (postalCodeString.length === 5) return postalCodeString;
  if (postalCodeString.length === 4) return "0" + postalCodeString;
  if (postalCodeString.length === 3) return "00" + postalCodeString;
  if (postalCodeString.length === 2) return "000" + postalCodeString;
  if (postalCodeString.length === 1) return "0000" + postalCodeString;
  return "";
};

const getDepartmentCode = (departmentCode: string, postalCode: string) => {
  if (departmentCode && DEPARTMENTS.hasOwnProperty(departmentCode)) return departmentCode;

  let code;
  if (postalCode.length === 5) code = postalCode.slice(0, 2);
  else if (postalCode.length === 4) code = postalCode.slice(0, 1);
  else return "";
  if (code === "97" || code === "98") code = postalCode.slice(0, 3);
  if (DEPARTMENTS.hasOwnProperty(code)) return code;
  else return "";
};

const getDepartement = (code?: string) => (code && code in DEPARTMENTS && DEPARTMENTS[code][0]) || "";
const getRegion = (code?: string) => (code && code in DEPARTMENTS && DEPARTMENTS[code][1]) || "";

const getAddress = (mission: Mission, missionXML: MissionXML) => {
  if (missionXML.addresses && Array.isArray(missionXML.addresses) && missionXML.addresses.length > 0) {
    const addresses: AddressItem[] = [];

    for (const address of missionXML.addresses) {
      const addressItem: AddressItem = {
        address: parseString(address.address),
        city: parseString(address.city),
        postalCode: "",
        departmentName: "",
        departmentCode: "",
        region: "",
        country: parseString(address.country),
        location: undefined,
        geoPoint: null,
      };

      if (addressItem.country === "France") addressItem.country = "FR";

      if (address.location && address.location.lon && address.location.lat) {
        addressItem.location = address.location;
        addressItem.geoPoint = {
          type: "Point",
          coordinates: [address.location.lon, address.location.lat],
        };
      }

      if (addressItem.country !== "FR") {
        addressItem.postalCode = parseString(address.postalCode);
        addressItem.departmentCode = parseString(address.departmentCode);
        addressItem.departmentName = parseString(address.departmentName);
        addressItem.region = parseString(address.region);
      } else {
        addressItem.postalCode = formatPostalCode(parseString(address.postalCode));
        if (addressItem.postalCode) {
          const departmentCode = getDepartmentCode(address.departmentCode, addressItem.postalCode);
          addressItem.departmentCode = departmentCode;
          addressItem.departmentName = getDepartement(departmentCode) || parseString(address.departmentName);
          addressItem.region = getRegion(departmentCode) || parseString(address.region);
        }
      }

      addresses.push(addressItem);
    }

    mission.addresses = addresses;
  }

  mission.country = parseString(missionXML.country || missionXML.countryCode);
  if (mission.country === "France") mission.country = "FR";

  // Dirty because reading a doc is too boring for some people
  let location = undefined;
  if (missionXML.lonLat) {
    // Service Civique use lonLat as field and have this format [lat, lon] --> stupid but eh...
    const lat = parseFloat(missionXML.lonLat.split(",")[0]) || undefined;
    const lon = parseFloat(missionXML.lonLat.split(",")[1]) || undefined;
    if (lat && lon) location = { lon, lat };
  }
  if (missionXML.lonlat) {
    const a = parseFloat(missionXML.lonlat.split(",")[0]) || undefined; // supposed lon
    const b = parseFloat(missionXML.lonlat.split(",")[1]) || undefined; // supposed lat
    if (a && b) {
      location = {} as { lon: number; lat: number };
      const little = a < b ? a : b;
      const big = a > b ? a : b;
      if (4.3 < little && little < 8) {
        // France
        location.lon = little;
        location.lat = big;
      } else if (b < -90 || 90 < b) {
        // lat should be betweem -90 and 90, if outside, consider its the lon
        location.lon = b;
        location.lat = a;
      } else {
        location.lon = a;
        location.lat = b;
      }
    }
  } else if (missionXML.location && missionXML.location.lon && missionXML.location.lat) {
    location = missionXML.location;
  }
  if (location && location.lon && location.lat && -90 <= location.lat && location.lat <= 90 && -180 <= location.lon && location.lon <= 180) mission.location = location;

  if (mission.location) mission.geoPoint = { type: "Point", coordinates: [mission.location.lon, mission.location.lat] };
  else mission.geoPoint = null;

  mission.address = parseString(missionXML.address || missionXML.adresse);
  mission.city = parseString(missionXML.city);

  if (mission.country !== "FR") {
    mission.postalCode = parseString(missionXML.postalCode);
    mission.departmentCode = parseString(missionXML.departmentCode);
    mission.departmentName = parseString(missionXML.departmentName);
    mission.region = parseString(missionXML.region);
    return;
  } else {
    mission.postalCode = formatPostalCode(parseString(missionXML.postalCode));
    if (mission.postalCode) {
      const departmentCode = getDepartmentCode(missionXML.departmentCode, mission.postalCode.toString());
      mission.departmentCode = departmentCode;
      mission.departmentName = getDepartement(departmentCode) || parseString(missionXML.departmentName);
      mission.region = getRegion(departmentCode) || parseString(missionXML.region);
    } else {
      mission.departmentCode = parseString(missionXML.departmentCode);
      mission.departmentName = parseString(missionXML.departmentName);
      mission.region = parseString(missionXML.region);
    }
  }
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
  if (missionXML.autonomyZips) {
    const firstAddress = Array.isArray(missionXML.autonomyZips.item) ? missionXML.autonomyZips.item[0] : missionXML.autonomyZips.item;
    missionXML.postalCode = firstAddress.zip;
    missionXML.city = firstAddress.city;
    missionXML.lonlat = `${firstAddress.longitude},${firstAddress.latitude}`;
  }
  getAddress(mission, missionXML);

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
