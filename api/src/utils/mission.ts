import { API_URL } from "../config";
import { AddressItem, Mission } from "../types";

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

const FIELDS_TO_COMPARE = [
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
  "tasks",
  "tags",
  "requirements",
  "softSkills",
  "romeSkills",
] as (keyof Mission)[];
// "addresses",

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
    if (previousMission[field] !== currentMission[field]) {
      changes[field] = {
        previous: previousMission[field],
        current: currentMission[field],
      };
    }
  }

  let hasAddressesChanged = false;
  if (previousMission.addresses.length !== currentMission.addresses.length) {
    hasAddressesChanged = true;
    changes.addresses = {
      previous: previousMission.addresses,
      current: currentMission.addresses,
    };
    return changes;
  }

  for (let i = 0; i < currentMission.addresses.length; i++) {
    const exists = previousMission.addresses.find((address) => areAddressesEqual(address, currentMission.addresses[i]));
    if (!exists) {
      hasAddressesChanged = true;
      changes.addresses = {
        previous: previousMission.addresses,
        current: currentMission.addresses,
      };
      break;
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

const areAddressesEqual = (previousAddress: AddressItem, currentAddress: AddressItem) => {
  return (
    previousAddress.street === currentAddress.street &&
    previousAddress.city === currentAddress.city &&
    previousAddress.postalCode === currentAddress.postalCode &&
    previousAddress.departmentCode === currentAddress.departmentCode &&
    previousAddress.departmentName === currentAddress.departmentName &&
    previousAddress.region === currentAddress.region &&
    previousAddress.country === currentAddress.country &&
    previousAddress.location?.lon === currentAddress.location?.lon &&
    previousAddress.location?.lat === currentAddress.location?.lat
  );
};
