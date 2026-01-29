import { Prisma } from "../db/core";
import { missionRepository, type BoundingBox } from "../repositories/mission";
import type { MissionSearchFilters } from "../types/mission";
import { calculateBoundingBox } from "../utils";

export const hasGeoFilters = (filters: MissionSearchFilters): boolean => {
  return filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined;
};

export const buildDateFilter = (range?: { gt?: Date; lt?: Date }): Prisma.DateTimeFilter | undefined => {
  if (!range) {
    return undefined;
  }
  const filter: Prisma.DateTimeFilter = {};
  if (range.gt) {
    filter.gt = range.gt;
  }
  if (range.lt) {
    filter.lt = range.lt;
  }
  return Object.keys(filter).length ? filter : undefined;
};

export const buildWhere = (filters: MissionSearchFilters): Prisma.MissionWhereInput => {
  const where: Prisma.MissionWhereInput = filters.directFilters ?? {};

  const orConditions: Prisma.MissionWhereInput[] = [];

  where.statusCode = filters.statusCode ?? "ACCEPTED";

  if (filters.statusComment) {
    where.statusComment = filters.statusComment;
  }

  if (!filters.includeDeleted) {
    where.deletedAt = null;
  } else if (filters.deletedAt) {
    const deletedAtFilter = buildDateFilter(filters.deletedAt);
    if (deletedAtFilter) {
      orConditions.push({ deletedAt: null }, { deletedAt: deletedAtFilter });
    }
  }

  if (filters.publisherIds?.length) {
    where.publisherId = { in: filters.publisherIds };
  }

  if (filters.excludeOrganizationClientIds?.length) {
    const existingNot = Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : [];
    where.NOT = [
      ...existingNot,
      {
        organizationClientId: { in: filters.excludeOrganizationClientIds },
      },
    ];
  }

  if (filters.activity?.length) {
    where.activity = { is: { name: { in: filters.activity } } };
  }
  if (filters.action?.length) {
    where.tasks = { hasSome: filters.action };
  }
  if (filters.beneficiary?.length) {
    where.audience = { hasSome: filters.beneficiary };
  }
  if (filters.clientId?.length) {
    where.clientId = { in: filters.clientId };
  }
  if (filters.organizationClientId?.length) {
    where.organizationClientId = { in: filters.organizationClientId };
  }
  if (filters.domain?.length && !filters.domainIncludeMissing) {
    where.domain = { is: { name: { in: filters.domain } } };
  } else if (filters.domain?.length && filters.domainIncludeMissing) {
    orConditions.push({ domain: { is: { name: { in: filters.domain } } } });
  }
  if (filters.domainIncludeMissing) {
    orConditions.push({ domainId: null });
  }
  if (filters.remote?.length) {
    where.remote = { in: filters.remote as any };
  }
  if (filters.type?.length) {
    where.type = { in: filters.type as any };
  }
  if (filters.schedule?.length) {
    where.schedule = { in: filters.schedule };
  }
  if (filters.snu) {
    where.snu = true;
  }
  if ("openToMinors" in filters && filters.openToMinors !== undefined) {
    where.openToMinors = filters.openToMinors as any;
  }
  if ("reducedMobilityAccessible" in filters && filters.reducedMobilityAccessible !== undefined) {
    where.reducedMobilityAccessible = filters.reducedMobilityAccessible as any;
  }
  if (filters.durationLte !== undefined) {
    where.duration = { ...(where.duration as Prisma.IntFilter | undefined), lte: filters.durationLte };
  }

  const createdAtFilter = buildDateFilter(filters.createdAt);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }
  const startAtFilter = buildDateFilter(filters.startAt);
  if (startAtFilter) {
    where.startAt = startAtFilter;
  }

  const addressAnd: Prisma.MissionAddressWhereInput = {};
  const addressOr: Prisma.MissionAddressWhereInput[] = [];
  if (filters.city?.length) {
    addressAnd.city = { in: filters.city };
  }
  if (filters.country?.length) {
    addressAnd.country = { in: filters.country };
  } else if (filters.countryNot?.length) {
    addressAnd.country = { notIn: filters.countryNot };
  }
  if (filters.departmentName?.length) {
    addressAnd.departmentName = { in: filters.departmentName };
  }
  if (filters.departmentNameIncludeMissing) {
    addressOr.push({ departmentName: null }, { departmentName: "" });
  }

  if (hasGeoFilters(filters)) {
    const { lat, lon, distanceKm } = filters;
    if (lat !== undefined && lon !== undefined && distanceKm !== undefined) {
      const { latMin, latMax, lonMin, lonMax } = calculateBoundingBox(lat, lon, distanceKm);
      addressAnd.locationLat = { gte: latMin, lte: latMax };
      addressAnd.locationLon = { gte: lonMin, lte: lonMax };
    }
  }

  if (Object.keys(addressAnd).length || addressOr.length) {
    const clauses = [];
    if (Object.keys(addressAnd).length) {
      clauses.push(addressAnd);
    }
    if (addressOr.length) {
      clauses.push(...addressOr);
    }
    where.addresses = clauses.length === 1 ? { some: clauses[0] } : { some: { OR: clauses } };
  }

  if (filters.organizationRNA?.length || filters.organizationStatusJuridique?.length || filters.organizationName?.length) {
    where.publisherOrganization = {
      is: {
        ...(filters.organizationRNA?.length ? { organizationRNA: { in: filters.organizationRNA } } : {}),
        ...(filters.organizationStatusJuridique?.length ? { organizationStatusJuridique: { in: filters.organizationStatusJuridique } } : {}),
        ...(filters.organizationName?.length ? { organizationName: { in: filters.organizationName } } : {}),
      },
    };
  }

  if (filters.moderationAcceptedFor) {
    const moderationWhere: Prisma.MissionModerationStatusWhereInput = { publisherId: filters.moderationAcceptedFor };
    if (filters.moderationStatus) {
      moderationWhere.status = filters.moderationStatus as any;
    }
    if (filters.moderationComment) {
      moderationWhere.comment = filters.moderationComment;
    }
    where.moderationStatuses = { some: moderationWhere };
  }

  if (filters.keywords) {
    const keywords = filters.keywords;
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...existingAnd,
      {
        OR: [
          { title: { contains: keywords, mode: "insensitive" } },
          { publisherOrganization: { is: { organizationName: { contains: keywords, mode: "insensitive" } } } },
          { addresses: { some: { city: { contains: keywords, mode: "insensitive" } } } },
          { domain: { is: { name: { contains: keywords, mode: "insensitive" } } } },
        ],
      },
    ];
  }

  if (filters.excludeOrganizationName) {
    const organizationWhere = (where.publisherOrganization?.is as Prisma.PublisherOrganizationWhereInput | undefined) ?? {};
    const nameFilter = (organizationWhere.organizationName as Prisma.StringFilter | undefined) ?? {};
    organizationWhere.organizationName = { ...nameFilter, not: filters.excludeOrganizationName };
    where.publisherOrganization = { is: organizationWhere };
  }

  if (orConditions.length) {
    const existingOr = Array.isArray(where.OR) ? where.OR : where.OR ? [where.OR] : [];
    where.OR = [...existingOr, ...orConditions];
  }

  return where;
};

/**
 * Build a where clause without geo filters (for use with GiST-optimized queries)
 */
export const buildWhereWithoutGeo = (filters: MissionSearchFilters): Prisma.MissionWhereInput => {
  const filtersWithoutGeo = { ...filters, lat: undefined, lon: undefined, distanceKm: undefined };
  return buildWhere(filtersWithoutGeo);
};

/**
 * Get bounding box from geo filters
 */
export const getBoundingBox = (filters: MissionSearchFilters): BoundingBox | null => {
  if (!hasGeoFilters(filters)) {
    return null;
  }
  const { lat, lon, distanceKm } = filters;
  return calculateBoundingBox(lat!, lon!, distanceKm!);
};

/**
 * Find mission IDs in bounding box using GiST index optimization.
 * Returns null if no geo filters are present, signaling to use standard Prisma query.
 */
export const findMissionIdsInBoundingBox = async (
  filters: MissionSearchFilters
): Promise<{ ids: string[]; total: number } | null> => {
  const box = getBoundingBox(filters);
  if (!box) {
    return null;
  }

  return missionRepository.findMissionIdsInBoundingBox({
    box,
    limit: filters.limit,
    offset: filters.skip,
  });
};
