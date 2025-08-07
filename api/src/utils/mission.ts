import { API_URL } from "../config";
import { AddressItem, Mission } from "../types";
import { slugify } from "./string";

/**
 * Format the tracked application URL for a mission and a given publisher
 *
 * @param mission The mission to format the URL for
 * @param publisherId The publisher ID to format the URL for
 * @returns The tracked application URL
 */
export const getMissionTrackedApplicationUrl = (mission: Mission, publisherId: string) => {
  return `${API_URL}/r/${mission._id}/${publisherId}`;
};

export const FIELDS_TO_COMPARE = [
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
  "domainLogo",
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
  "organizationVerificationStatus",
  "statusComment",
  "statusCode",
] as (keyof Mission)[];

/**
 * Get the changes between two missions
 *
 * @param previousMission The previous mission
 * @param currentMission The current mission
 * @returns The changes between the two missions
 */
export const getMissionChanges = (previousMission: Mission, currentMission: Mission): Record<string, { previous: any; current: any }> | null => {
  const changes: Record<string, { previous: any; current: any }> = {};

  for (const field of FIELDS_TO_COMPARE) {
    if (Array.isArray(previousMission[field]) && Array.isArray(currentMission[field])) {
      if (!areArraysEqual(previousMission[field], currentMission[field])) {
        changes[field] = {
          previous: previousMission[field],
          current: currentMission[field],
        };
      }
      continue;
    }

    if (field.endsWith("At")) {
      if (!areDatesEqual(previousMission[field] as any, currentMission[field] as any)) {
        changes[field] = {
          previous: new Date(previousMission[field] as any),
          current: new Date(currentMission[field] as any),
        };
      }
      continue;
    }

    if (!previousMission[field] && previousMission[field] !== 0 && !currentMission[field] && currentMission[field] !== 0) {
      continue;
    }

    if (!previousMission[field] && previousMission[field] !== 0 && !currentMission[field] && currentMission[field] !== 0) {
      changes[field] = {
        previous: previousMission[field],
        current: currentMission[field],
      };
    }

    if (String(previousMission[field]) !== String(currentMission[field])) {
      changes[field] = {
        previous: previousMission[field],
        current: currentMission[field],
      };
    }
  }

  if (previousMission.addresses.length !== currentMission.addresses.length) {
    changes.addresses = {
      previous: previousMission.addresses,
      current: currentMission.addresses,
    };
    return changes;
  }

  const sortedPreviousAddresses = normalizeAddresses(previousMission.addresses);
  const sortedCurrentAddresses = normalizeAddresses(currentMission.addresses);

  for (let i = 0; i < sortedCurrentAddresses.length; i++) {
    if (sortedPreviousAddresses[i] !== sortedCurrentAddresses[i]) {
      changes.addresses = {
        previous: previousMission.addresses,
        current: currentMission.addresses,
      };
      break;
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

const areDatesEqual = (previousDate: Date | string | undefined, currentDate: Date | string | undefined) => {
  if (!previousDate && !currentDate) {
    return true;
  }
  if (!previousDate || !currentDate) {
    return false;
  }
  return new Date(previousDate).getTime() === new Date(currentDate).getTime();
};

const areArraysEqual = (previousArray: any[], currentArray: any[]) => {
  if (previousArray.length !== currentArray.length) {
    return false;
  }
  const sortedPreviousArray = [...previousArray].sort();
  const sortedCurrentArray = [...currentArray].sort();

  for (let i = 0; i < sortedPreviousArray.length; i++) {
    if (String(sortedPreviousArray[i]) !== String(sortedCurrentArray[i])) {
      return false;
    }
  }
  return true;
};

const normalizeAddresses = (address: AddressItem[]) => {
  const data = address.map((item) =>
    slugify(`${item.street} ${item.city} ${item.postalCode} ${item.departmentName} ${item.region} ${item.country} ${item.location?.lat} ${item.location?.lon}`)
  );
  return data.sort();
};
