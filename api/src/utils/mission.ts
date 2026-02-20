import { API_URL } from "../config";
import { MissionRecord } from "../types/mission";
import { JobBoardId, MissionJobBoardSyncStatus } from "../types/mission-job-board";
import { parseDate } from "./parser";
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
  "activities",
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
  "publisherOrganizationId",
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
  "tags",
  "title",
  "type",
  "compensationAmount",
  "compensationType",
  "compensationUnit",
] as (keyof MissionRecord)[];

/**
 * Compare two missions and returns a changes patch.
 *
 * Comparison business rules:
 * - Fields listed in IMPORT_FIELDS_TO_COMPARE are compared, with specific handling per type.
 * - "At" date fields compare by day for postedAt/startAt/endAt (ignore time),
 *   and strict timestamp comparison for the other date fields.
 * - Arrays are compared ignoring order (sort + compare).
 * - "Empty" values (null/undefined/"") are normalized to avoid noisy changes.
 * - Addresses are compared only by city, and import events only keep { city }
 *   to avoid overwriting other fields on every import.
 * - If the number of addresses changes, the list is treated as changed (still limited to city).
 *
 * @param previousMission The mission from the database
 * @param currentMission The mission from the import
 * @returns A changes object or null if nothing relevant changed
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
      previous: mapAddressesForCityChange(previousMission.addresses),
      current: mapAddressesForCityChange(currentMission.addresses),
    };
    return changes;
  }

  const sortedPreviousAddresses = normalizeAddressesByCity(previousMission.addresses) || [];
  const sortedCurrentAddresses = normalizeAddressesByCity(currentMission.addresses) || [];

  for (let i = 0; i < sortedCurrentAddresses.length; i++) {
    if (sortedPreviousAddresses[i] !== sortedCurrentAddresses[i]) {
      changes.addresses = {
        previous: mapAddressesForCityChange(previousMission.addresses),
        current: mapAddressesForCityChange(currentMission.addresses),
      };
      break;
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
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
  const normalizedPrevious = new Set(previousArray.map((item) => String(item)));
  const normalizedCurrent = new Set(currentArray.map((item) => String(item)));
  if (normalizedPrevious.size !== normalizedCurrent.size) {
    return false;
  }
  for (const value of normalizedPrevious) {
    if (!normalizedCurrent.has(value)) {
      return false;
    }
  }
  return true;
};

const normalizeAddressValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" && !value.trim()) {
    return "";
  }
  return value;
};

const mapAddressesForCityChange = (addresses: MissionRecord["addresses"]) =>
  addresses?.map((address) => ({
    city: address.city ?? null,
  })) ?? [];

const normalizeAddressesByCity = (address: MissionRecord["addresses"]) => {
  const data = address.map((item) => slugify(`${normalizeAddressValue(item.city)}`));
  return data.sort();
};
