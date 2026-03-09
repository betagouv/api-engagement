import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import { normalizeRNA } from "@/utils/organization";
import { parseDate, parseSiren } from "@/utils/parser";
import { slugify } from "@/utils/string";

// ──────────────────────────────────────────────────────────────────────────────
// Client ID derivation
// ──────────────────────────────────────────────────────────────────────────────

export interface OrganizationClientIdInput {
  organizationClientId?: string | null;
  organizationRNA?: string | null;
  organizationSiren?: string | null;
  organizationSiret?: string | null;
  organizationName?: string | null;
}

/**
 * Derives a stable clientId for a publisher organization from available identifiers.
 * Priority: explicit clientId → RNA → SIRET → SIREN → name slug
 */
export const deriveOrganizationClientId = (input: OrganizationClientIdInput): string | null => {
  if (input.organizationClientId) {
    return input.organizationClientId;
  }
  const rna = normalizeRNA(input.organizationRNA);
  if (rna) {
    return rna;
  }
  const fromSiret = parseSiren(input.organizationSiret ?? undefined);
  const fromSiren = parseSiren(input.organizationSiren ?? undefined);
  const siret = fromSiret.siret ?? fromSiren.siret;
  const siren = fromSiren.siren ?? fromSiret.siren;
  if (siret) {
    return siret;
  }
  if (siren) {
    return siren;
  }
  if (input.organizationName) {
    return slugify(input.organizationName);
  }
  return null;
};

// ──────────────────────────────────────────────────────────────────────────────
// Change detection
// ──────────────────────────────────────────────────────────────────────────────

export const IMPORT_FIELDS_TO_COMPARE = [
  "name",
  "rna",
  "siren",
  "siret",
  "url",
  "logo",
  "description",
  "legalStatus",
  "type",
  "actions",
  "fullAddress",
  "postalCode",
  "city",
  "beneficiaries",
  "parentOrganizations",
] as (keyof PublisherOrganizationRecord)[];

/**
 * Compare two publisher organizations and returns a changes patch.
 *
 * Comparison business rules:
 * - Fields listed in IMPORT_FIELDS_TO_COMPARE are compared, with specific handling per type.
 * - Arrays are compared ignoring order (sort + compare).
 * - "Empty" values (null/undefined/"") are normalized to avoid noisy changes.
 *
 * @param previousOrganization The organization from the database
 * @param currentOrganization The organization from the import
 * @param fieldsToCompare The fields to compare (defaults to IMPORT_FIELDS_TO_COMPARE)
 * @returns A changes object or null if nothing relevant changed
 */
export const getPublisherOrganizationChanges = (
  previousOrganization: PublisherOrganizationRecord,
  currentOrganization: PublisherOrganizationRecord,
  fieldsToCompare: (keyof PublisherOrganizationRecord)[] = IMPORT_FIELDS_TO_COMPARE
): Record<string, { previous: any; current: any }> | null => {
  const changes: Record<string, { previous: any; current: any }> = {};

  for (const field of fieldsToCompare) {
    if (Array.isArray(previousOrganization[field]) && Array.isArray(currentOrganization[field])) {
      if (!areArraysEqual(previousOrganization[field] as any, currentOrganization[field] as any)) {
        changes[field] = {
          previous: previousOrganization[field],
          current: currentOrganization[field],
        };
      }
      continue;
    }

    if (field.endsWith("At")) {
      if (!areDatesEqual(previousOrganization[field] as any, currentOrganization[field] as any)) {
        changes[field] = {
          previous: parseDate(previousOrganization[field] as any),
          current: parseDate(currentOrganization[field] as any),
        };
      }
      continue;
    }

    if (!previousOrganization[field] && !currentOrganization[field]) {
      continue;
    }

    if (String(previousOrganization[field]) !== String(currentOrganization[field])) {
      changes[field] = {
        previous: previousOrganization[field],
        current: currentOrganization[field],
      };
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
