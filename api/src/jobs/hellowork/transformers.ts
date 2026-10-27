import { PUBLISHER_IDS } from "@/config";
import { CONTRACT_TYPE_STAGE, DEFAULT_SECTOR, DOMAIN_SECTOR, REMOTE_ADDRESS, SALARY_PERIOD, SC_PROFIL_HTML, TELEWORK, TELEWORK_NONE } from "@/jobs/hellowork/config";
import { HelloworkAddress, HelloworkOffer } from "@/jobs/hellowork/types";
import { buildScTitle, formatDate, listToHtml, textToHtml } from "@/jobs/hellowork/utils";
import { MissionAddress, MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils";

function toAddress(address: MissionAddress): HelloworkAddress | null {
  if (!address.postalCode || !address.city) {
    return null;
  }
  const country = !address.country || address.country === "FR" ? "France" : address.country;
  return {
    Voie: address.street || undefined,
    CodePostal: address.postalCode,
    Ville: address.city,
    Departement: address.departmentName || undefined,
    Region: address.region || undefined,
    Pays: country,
    Latitude: address.location?.lat,
    Longitude: address.location?.lon,
  };
}

/** Adresses valides (code postal ET ville) ; mission 100 % à distance sans adresse : repli Paris. Vide si non localisable. */
function resolveAddresses(mission: MissionRecord): HelloworkAddress[] {
  const addresses = mission.addresses.map(toAddress).filter((address): address is HelloworkAddress => address !== null);
  if (addresses.length === 0 && mission.remote === "full") {
    return [{ CodePostal: REMOTE_ADDRESS.postalCode, Ville: REMOTE_ADDRESS.city, Pays: REMOTE_ADDRESS.country }];
  }
  return addresses;
}

function resolveSalary(mission: MissionRecord): HelloworkOffer["NiveauSalaire"] {
  if (mission.compensationAmount == null || !mission.compensationUnit) {
    return undefined;
  }
  return {
    "@_Devise": "EUR",
    "@_Periodicite": SALARY_PERIOD[mission.compensationUnit],
    "@_Affichable": "true",
    SalaireMin: mission.compensationAmount,
    SalaireMax: mission.compensationAmountMax ?? undefined,
  };
}

function resolveMission(mission: MissionRecord): HelloworkOffer["Mission"] {
  if (!mission.startAt && !mission.endAt) {
    return undefined;
  }
  return { StartDate: mission.startAt?.toISOString(), EndDate: mission.endAt?.toISOString() };
}

/**
 * Transforme une mission en offre Hellowork. Seul le dispositif Service Civique est formaté en V1
 * (contrat « Stage », titre préfixé, profil fixe) ; les autres missions sont ignorées.
 * Retourne null si la mission est ignorée : autre dispositif, sans organisation, non localisable ou expirée.
 */
export function missionToOffer(mission: MissionRecord): HelloworkOffer | null {
  if (mission.publisherId !== PUBLISHER_IDS.SERVICE_CIVIQUE || !mission.organizationName || !mission.title) {
    return null;
  }
  if (mission.endAt && mission.endAt.getTime() < Date.now()) {
    return null;
  }
  const addresses = resolveAddresses(mission);
  if (addresses.length === 0) {
    return null;
  }

  return {
    Nom_Ese: mission.organizationName,
    Agence: mission.publisherName || undefined,
    Poste: buildScTitle(mission.title),
    Reference: mission.id,
    ExternalId: mission.id,
    DescriptionEntreprise: textToHtml(mission.organizationDescription) || undefined,
    // `description` peut être aplati (sans \n) : on repart de `descriptionHtml` quand il existe.
    DescriptionPoste: textToHtml(mission.descriptionHtml || mission.description),
    Profil: `${SC_PROFIL_HTML}${listToHtml(mission.requirements ?? [])}`,
    AdressesPostales: { AdressePostale: addresses },
    Ville: addresses[0].Ville,
    NiveauSalaire: resolveSalary(mission),
    Url_Reponse: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.HELLOWORK),
    Aveugle: 0,
    DateAnnonce: formatDate(mission.postedAt ?? mission.createdAt),
    DateModification: formatDate(mission.updatedAt),
    Criteres: {
      CritereSecteur: DOMAIN_SECTOR[mission.domain ?? ""] ?? DEFAULT_SECTOR,
      CritereContrat: CONTRACT_TYPE_STAGE,
      Teletravail: TELEWORK[mission.remote ?? ""] ?? TELEWORK_NONE,
    },
    Mission: resolveMission(mission),
  };
}
