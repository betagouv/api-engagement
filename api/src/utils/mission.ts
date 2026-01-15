import { API_URL } from "../config";
import { MissionRecord } from "../types/mission";
import { JobBoardId, MissionJobBoardSyncStatus } from "../types/mission-job-board";
import { slugify } from "./string";

/**
 * Format the tracked application URL for a mission and a given publisher
 *
 * @param mission The mission to format the URL for
 * @param publisherId The publisher ID to format the URL for
 * @returns The tracked application URL
 */
export const getMissionTrackedApplicationUrl = (mission: MissionRecord, publisherId: string) => {
  return `${API_URL}/r/${mission.id}/${publisherId}`;
};

export type MissionAddressWithLocation = {
  id: string;
  street: string | null;
  postalCode: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  locationLat: number | null;
  locationLon: number | null;
  geolocStatus: string | null;
};

export const normalizeMissionAddresses = (addresses: MissionAddressWithLocation[]): MissionRecord["addresses"] =>
  addresses.map((address) => ({
    id: address.id,
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    departmentName: address.departmentName ?? null,
    departmentCode: address.departmentCode ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    country: address.country ?? null,
    location: address.locationLat != null && address.locationLon != null ? { lat: address.locationLat, lon: address.locationLon } : null,
    geoPoint: address.locationLat != null && address.locationLon != null ? { type: "Point", coordinates: [address.locationLon, address.locationLat] } : null,
    geolocStatus: address.geolocStatus ?? null,
  }));

export const deriveMissionLocation = (addresses: MissionRecord["addresses"]) => {
  const first = addresses[0];
  if (first?.location) {
    return first.location;
  }
  return null;
};

type MissionJobBoardEntry = {
  jobBoardId: JobBoardId | string;
  publicId: string | null;
  status: string | null;
  syncStatus?: MissionJobBoardSyncStatus | null;
  comment: string | null;
  updatedAt: Date | null;
};

export const buildJobBoardMap = (entries?: MissionJobBoardEntry[]): MissionRecord["jobBoards"] | undefined => {
  if (!entries?.length) {
    return undefined;
  }
  const map: NonNullable<MissionRecord["jobBoards"]> = {};

  for (const entry of entries) {
    const key = entry.jobBoardId as keyof NonNullable<MissionRecord["jobBoards"]>;
    const payload = {
      status: entry.status ?? null,
      syncStatus: entry.syncStatus ?? null,
      comment: entry.comment ?? null,
      url: entry.publicId ?? null,
      updatedAt: entry.updatedAt ?? null,
    };
    const current = map[key];
    const shouldReplace = !current || (payload.updatedAt && (!current.updatedAt || payload.updatedAt > current.updatedAt));
    if (shouldReplace) {
      map[key] = payload;
    }
  }

  return Object.keys(map).length ? map : undefined;
};

export const EVENT_TYPES = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

const IMPORT_DATE_FIELDS_IGNORE_TIME = new Set<keyof MissionRecord>(["postedAt", "startAt", "endAt"]);

export const IMPORT_FIELDS_TO_COMPARE = [
  "activity",
  "applicationUrl",
  "audience",
  "clientId",
  "closeToTransport",
  "deletedAt",
  "description",
  "descriptionHtml",
  "domain",
  "domainLogo",
  "duration",
  "endAt",
  "metadata",
  "openToMinors",
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
  "places",
  "postedAt",
  "priority",
  "reducedMobilityAccessible",
  "remote",
  "requirements",
  "romeSkills",
  "schedule",
  "snu",
  "snuPlaces",
  "softSkills",
  "startAt",
  "statusCode",
  "statusComment",
  "tags",
  "title",
  "type",
  "compensationAmount",
  "compensationType",
  "compensationUnit",
] as (keyof MissionRecord)[];

/**
 * Get the changes between two missions
 *
 * @param previousMission The previous mission
 * @param currentMission The current mission
 * @returns The changes between the two missions
 */
export const getMissionChanges = (
  previousMission: MissionRecord,
  currentMission: MissionRecord,
  fieldsToCompare: (keyof MissionRecord)[] = IMPORT_FIELDS_TO_COMPARE
): Record<string, { previous: any; current: any }> | null => {
  const changes: Record<string, { previous: any; current: any }> = {};

  for (const field of fieldsToCompare) {
    if (Array.isArray(previousMission[field]) && Array.isArray(currentMission[field])) {
      if (!areArraysEqual(previousMission[field] as any, currentMission[field] as any)) {
        changes[field] = {
          previous: previousMission[field],
          current: currentMission[field],
        };
      }
      continue;
    }

    if (field.endsWith("At")) {
      const ignoreTime = IMPORT_DATE_FIELDS_IGNORE_TIME.has(field);
      if (!areDatesEqual(previousMission[field] as any, currentMission[field] as any, { ignoreTime })) {
        changes[field] = {
          previous: parseDate(previousMission[field] as any),
          current: parseDate(currentMission[field] as any),
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

  if (previousMission.addresses?.length !== currentMission.addresses?.length) {
    changes.addresses = {
      previous: previousMission.addresses,
      current: currentMission.addresses,
    };
    return changes;
  }

  const sortedPreviousAddresses = normalizeAddresses(previousMission.addresses) || [];
  const sortedCurrentAddresses = normalizeAddresses(currentMission.addresses) || [];

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

const parseDate = (value: string | Date | undefined) => {
  if (!value) {
    return null;
  }
  return isNaN(new Date(value).getTime()) ? null : new Date(value);
};

const toUtcDayKey = (value: Date | string | undefined): number | null => {
  const date = parseDate(value);
  if (!date) {
    return null;
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const areDatesEqual = (previousDate: Date | string | undefined, currentDate: Date | string | undefined, { ignoreTime }: { ignoreTime: boolean }) => {
  if (!previousDate && !currentDate) {
    return true;
  }
  if (!previousDate || !currentDate) {
    return false;
  }

  if (ignoreTime) {
    return toUtcDayKey(previousDate) === toUtcDayKey(currentDate);
  }

  return parseDate(previousDate)?.getTime() === parseDate(currentDate)?.getTime();
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

const normalizeAddresses = (address: MissionRecord["addresses"]) => {
  const data = address.map((item) =>
    slugify(`${item.street} ${item.city} ${item.postalCode} ${item.departmentName} ${item.region} ${item.country} ${item.location?.lat} ${item.location?.lon}`)
  );
  return data.sort();
};
