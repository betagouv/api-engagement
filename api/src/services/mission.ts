import { randomUUID } from "crypto";

import { Mission, Prisma } from "../db/core";
import { missionRepository } from "../repositories/mission";
import { organizationRepository } from "../repositories/organization";
import type {
  MissionCreateInput,
  MissionFacets,
  MissionRecord,
  MissionSearchAggregations,
  MissionSearchFilters,
  MissionUpdatePatch,
} from "../types/mission";
import { getDistanceFromLatLonInKm } from "../utils/geo";
import { publisherService } from "./publisher";
import { prismaCore } from "../db/postgres";

type MissionWithRelations = Mission & {
  publisher?: { name: string | null; url: string | null; logo: string | null } | null;
  organization?: {
    title: string;
    rna: string | null;
    siren: string | null;
    siret: string | null;
    addressDepartmentName: string | null;
    addressDepartmentCode: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    status: string | null;
    names: string[];
  } | null;
  addresses: Array<{
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
  }>;
  domains?: Array<{ value: string; original: string | null; logo: string | null }>;
  activities?: Array<{ value: string }>;
  moderationStatuses?: Array<{
    publisherId: string;
    status: string | null;
    comment: string | null;
    note: string | null;
    title: string | null;
    createdAt: Date;
  }>;
  jobBoards?: Array<{
    jobBoardId: string;
    publicId: string;
    status: string | null;
    comment: string | null;
    updatedAt: Date;
  }>;
};

const emptyStringArray = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const mapDomainsForCreate = (domain?: string | null, domainOriginal?: string | null, domainLogo?: string | null) => {
  if (!domain) {
    return [];
  }
  return [{ value: domain, original: domainOriginal ?? null, logo: domainLogo ?? null }];
};

const mapActivitiesForCreate = (activity?: string | null) => {
  if (!activity) {
    return [];
  }
  return [{ value: activity }];
};

const normalizeAddresses = (addresses: MissionWithRelations["addresses"]) =>
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
    geoPoint:
      address.locationLat != null && address.locationLon != null
        ? { type: "Point", coordinates: [address.locationLon, address.locationLat] }
        : null,
    geolocStatus: address.geolocStatus ?? null,
  }));

const deriveLocation = (addresses: ReturnType<typeof normalizeAddresses>) => {
  const first = addresses[0];
  if (first?.location) {
    return first.location;
  }
  return null;
};

const toMissionRecord = (mission: MissionWithRelations): MissionRecord => {
  const addresses = normalizeAddresses(mission.addresses || []) as MissionRecord["addresses"];
  const location = deriveLocation(addresses);
  const primaryAddress = addresses[0] ?? {};

  const org = mission.organization;
  const publisherName = mission.publisher?.name ?? null;
  const publisherLogo = mission.publisher?.logo ?? null;
  const publisherUrl = mission.publisher?.url ?? null;
  const primaryDomain = mission.domains?.[0];
  const primaryActivity = mission.activities?.[0];
  const letudiantJobBoard = mission.jobBoards?.find((jobBoard) => jobBoard.jobBoardId === "LETUDIANT");

  const softSkills = emptyStringArray(mission.softSkills);

  const record: MissionRecord = {
    _id: mission.id,
    id: mission.id,
    clientId: mission.clientId,
    publisherId: mission.publisherId,
    publisherName,
    publisherUrl,
    publisherLogo,
    title: mission.title,
    description: mission.description ?? null,
    descriptionHtml: mission.descriptionHtml ?? null,
    tags: emptyStringArray(mission.tags),
    tasks: emptyStringArray(mission.tasks),
    audience: emptyStringArray(mission.audience),
    softSkills,
    soft_skills: softSkills,
    requirements: emptyStringArray(mission.requirements),
    romeSkills: emptyStringArray(mission.romeSkills),
    reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
    closeToTransport: mission.closeToTransport ?? null,
    openToMinors: mission.openToMinors ?? null,
    remote: mission.remote ?? null,
    schedule: mission.schedule ?? null,
    duration: mission.duration ?? null,
    postedAt: mission.postedAt ?? null,
    startAt: mission.startAt ?? null,
    endAt: mission.endAt ?? null,
    priority: mission.priority ?? null,
    places: mission.places ?? null,
    placesStatus: mission.placesStatus ?? null,
    metadata: mission.metadata ?? null,
    domain: primaryDomain?.value ?? null,
    domainOriginal: primaryDomain?.original ?? null,
    domainLogo: primaryDomain?.logo ?? null,
    activity: primaryActivity?.value ?? null,
    type: mission.type ?? null,
    snu: mission.snu ?? false,
    snuPlaces: mission.snuPlaces ?? null,
    compensationAmount: mission.compensationAmount ?? null,
    compensationUnit: mission.compensationUnit ?? null,
    compensationType: mission.compensationType ?? null,
    adresse: primaryAddress.street ?? null,
    address: primaryAddress.street ?? null,
    postalCode: primaryAddress.postalCode ?? null,
    departmentName: primaryAddress.departmentName ?? null,
    departmentCode: primaryAddress.departmentCode ?? null,
    city: primaryAddress.city ?? null,
    region: primaryAddress.region ?? null,
    country: primaryAddress.country ?? null,
    location,
    addresses,
    organizationId: mission.organizationId ?? null,
    organizationClientId: mission.organizationClientId ?? null,
    organizationUrl: null,
    organizationName: org?.title ?? null,
    organizationType: org?.status ?? null,
    organizationLogo: null,
    organizationDescription: null,
    organizationFullAddress: null,
    organizationRNA: org?.rna ?? null,
    organizationSiren: org?.siren ?? null,
    organizationSiret: org?.siret ?? null,
    organizationDepartment: org?.addressDepartmentName ?? null,
    organizationDepartmentCode: org?.addressDepartmentCode ?? null,
    organizationDepartmentName: org?.addressDepartmentName ?? null,
    organizationPostCode: org?.addressPostalCode ?? null,
    organizationCity: org?.addressCity ?? null,
    organizationStatusJuridique: org?.status ?? null,
    organizationBeneficiaries: [],
    organizationActions: [],
    organizationReseaux: org?.names ?? [],
    organizationNameVerified: null,
    organizationRNAVerified: null,
    organizationSirenVerified: null,
    organizationSiretVerified: null,
    organizationAddressVerified: null,
    organizationCityVerified: null,
    organizationPostalCodeVerified: null,
    organizationDepartmentCodeVerified: null,
    organizationDepartmentNameVerified: null,
    organizationRegionVerified: null,
    organizationVerificationStatus: null,
    organisationIsRUP: null,
    lastSyncAt: mission.lastSyncAt ?? null,
    applicationUrl: mission.applicationUrl ?? null,
    statusCode: (mission.statusCode as MissionRecord["statusCode"]) ?? "ACCEPTED",
    statusComment: mission.statusComment ?? null,
    deletedAt: mission.deletedAt ?? null,
    letudiantUpdatedAt: letudiantJobBoard?.updatedAt ?? null,
    letudiantError: letudiantJobBoard?.comment ?? null,
    lastExportedToPgAt: mission.lastExportedToPgAt ?? null,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
  };

  if (mission.moderationStatuses?.length) {
    for (const moderation of mission.moderationStatuses) {
      const publisherKey = moderation.publisherId;
      (record as any)[`moderation_${publisherKey}_status`] = moderation.status ?? null;
      (record as any)[`moderation_${publisherKey}_comment`] = moderation.comment ?? null;
      (record as any)[`moderation_${publisherKey}_note`] = moderation.note ?? null;
      (record as any)[`moderation_${publisherKey}_title`] = moderation.title ?? null;
      (record as any)[`moderation_${publisherKey}_date`] = moderation.createdAt ?? null;
    }
  }

  return record;
};

const buildDateFilter = (range?: { gt?: Date; lt?: Date }) => {
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
  const where: Prisma.MissionWhereInput = {
    statusCode: "ACCEPTED",
  };
  const orConditions: Prisma.MissionWhereInput[] = [];

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
    where.activities = { some: { value: { in: filters.activity } } };
  }
  if (filters.clientId?.length) {
    where.clientId = { in: filters.clientId };
  }
  if (filters.organizationClientId?.length) {
    where.organizationClientId = { in: filters.organizationClientId };
  }
  if (filters.domain?.length && !filters.domainIncludeMissing) {
    where.domains = { some: { value: { in: filters.domain } } };
  } else if (filters.domain?.length && filters.domainIncludeMissing) {
    orConditions.push({ domains: { some: { value: { in: filters.domain } } } });
  }
  if (filters.domainIncludeMissing) {
    orConditions.push({ domains: { none: {} } });
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
    where.organization = {
      ...(filters.organizationRNA?.length ? { rna: { in: filters.organizationRNA } } : {}),
      ...(filters.organizationStatusJuridique?.length ? { status: { in: filters.organizationStatusJuridique } } : {}),
      ...(filters.organizationName?.length ? { title: { in: filters.organizationName } } : {}),
    };
  }

  if (filters.moderationAcceptedFor) {
    where.moderationStatuses = { some: { publisherId: filters.moderationAcceptedFor, status: "ACCEPTED" } };
  }

  if (filters.keywords) {
    const keywords = filters.keywords;
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { title: { contains: keywords, mode: "insensitive" } },
          { organization: { title: { contains: keywords, mode: "insensitive" } } },
          { addresses: { some: { city: { contains: keywords, mode: "insensitive" } } } },
          { domain: { contains: keywords, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (filters.excludeOrganizationName) {
    const organizationWhere = (where.organization as Prisma.OrganizationWhereInput | undefined) ?? {};
    const titleFilter = (organizationWhere.title as Prisma.StringFilter | undefined) ?? {};
    organizationWhere.title = { ...titleFilter, not: filters.excludeOrganizationName };
    where.organization = organizationWhere;
  }

  if (orConditions.length) {
    const existingOr = Array.isArray(where.OR) ? where.OR : where.OR ? [where.OR] : [];
    where.OR = [...existingOr, ...orConditions];
  }

  return where;
};

const computeFacetsFromRecords = (records: MissionRecord[]): MissionFacets => {
  const counts = <T extends string>(getter: (record: MissionRecord) => T | null) => {
    const map = new Map<string, number>();
    for (const record of records) {
      const key = getter(record);
      if (!key) {
        continue;
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  };

  return {
    domain: counts((r) => r.domain),
    activity: counts((r) => r.activity),
    departmentName: counts((r) => r.departmentName),
  };
};

const buildAggregationsFromRecords = async (records: MissionRecord[]): Promise<MissionSearchAggregations> => {
  const aggregate = (getter: (record: MissionRecord) => string | null | undefined) => {
    const map = new Map<string, number>();
    records.forEach((record) => {
      const key = getter(record);
      if (!key) {
        return;
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, doc_count: count }));
  };

  const partners = aggregate((record) => record.publisherId ?? undefined).map(({ key, doc_count }) => ({ _id: key, count: doc_count }));
  const publisherIds = partners.map((partner) => partner._id);
  const publishers = await publisherService.findPublishersByIds(publisherIds);
  const publisherById = new Map(publishers.map((publisher) => [publisher._id, publisher]));

  return {
    status: aggregate((record) => record.statusCode || undefined),
    comments: aggregate((record) => record.statusComment || undefined),
    type: aggregate((record) => record.type || undefined),
    domains: aggregate((record) => record.domain || undefined),
    organizations: aggregate((record) => record.organizationName || undefined),
    activities: aggregate((record) => record.activity || undefined),
    cities: aggregate((record) => record.city || undefined),
    departments: aggregate((record) => record.departmentName || undefined),
    partners: partners.map((partner) => {
      const publisher = publisherById.get(partner._id);
      return {
        ...partner,
        name: publisher?.name,
        mission_type: publisher?.missionType === "volontariat_service_civique" ? "volontariat" : "benevolat",
      };
    }),
  };
};

const isNonEmpty = (value: string | null | undefined) => value !== null && value !== undefined && value !== "";

const buildAggregations = async (where: Prisma.MissionWhereInput): Promise<MissionSearchAggregations> => {
  const aggregateMissionField = async (field: Prisma.MissionScalarFieldEnum) => {
    const rows = await prismaCore.mission.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    });

    return rows
      .map((row) => ({
        key: String((row as any)[field] ?? ""),
        doc_count: Number((row as any)._count?._all ?? 0),
      }))
      .filter((row) => isNonEmpty(row.key))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  const aggregateAddressField = async (field: "city" | "departmentName") => {
    const rows = await prismaCore.missionAddress.groupBy({
      by: [field],
      where: { mission: where },
      _count: { _all: true },
    });

    return rows
      .map((row) => ({
        key: String((row as any)[field] ?? ""),
        doc_count: Number((row as any)._count?._all ?? 0),
      }))
      .filter((row) => isNonEmpty(row.key))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  // Run sequentially to avoid exhausting the small Prisma connection pool when many filters are used
  const status = await aggregateMissionField("statusCode");
  const comments = await aggregateMissionField("statusComment");
  const domains = await aggregateMissionField("domain");
  const activities = await aggregateMissionField("activity");
  const partnersRaw = await aggregateMissionField("publisherId");
  const organizationsRaw = await aggregateMissionField("organizationId");
  const cities = await aggregateAddressField("city");
  const departments = await aggregateAddressField("departmentName");

  const organizationIds = organizationsRaw.map((row) => row.key).filter(isNonEmpty) as string[];
  const organizations =
    organizationIds.length > 0
      ? await organizationRepository.findMany({ where: { id: { in: organizationIds } }, select: { id: true, title: true } })
      : [];
  const orgById = new Map(organizations.map((org) => [org.id, org.title ?? ""]));
  const organizationsAgg = organizationsRaw
    .map((row) => ({ key: orgById.get(row.key) ?? "", doc_count: row.doc_count }))
    .filter((row) => isNonEmpty(row.key))
    .sort((a, b) => b.doc_count - a.doc_count);

  const publisherIds = partnersRaw.map((row) => row.key).filter(isNonEmpty) as string[];
  const publishers = publisherIds.length ? await publisherService.findPublishersByIds(publisherIds) : [];
  const publisherById = new Map(publishers.map((publisher) => [publisher._id, publisher]));
  const partners = partnersRaw
    .map((row) => {
      const publisher = publisherById.get(row.key);
      return {
        _id: row.key,
        count: row.doc_count,
        name: publisher?.name,
        mission_type: publisher?.missionType === "volontariat_service_civique" ? "volontariat" : "benevolat",
      };
    })
    .filter((row) => isNonEmpty(row._id))
    .sort((a, b) => b.count - a.count);

  return { status, comments, domains, organizations: organizationsAgg, activities, cities, departments, partners };
};

const mapAddressesForCreate = (addresses?: MissionRecord["addresses"]) => {
  if (!addresses || !addresses.length) {
    return [];
  }
  return addresses.map((address) => ({
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    departmentName: address.departmentName ?? null,
    departmentCode: address.departmentCode ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    country: address.country ?? null,
    locationLat: address.location?.lat ?? null,
    locationLon: address.location?.lon ?? null,
    geolocStatus: (address as any).geolocStatus ?? null,
  }));
};

const baseInclude = { publisher: true, organization: true, addresses: true, moderationStatuses: true, domains: true, activities: true, jobBoards: true };

export const missionService = {
  async findOneMission(id: string): Promise<MissionRecord | null> {
    const mission = await missionRepository.findFirst({
      where: { id },
      include: baseInclude,
    });
    return mission ? toMissionRecord(mission as MissionWithRelations) : null;
  },

  async findOneMissionBy(where: Prisma.MissionWhereInput): Promise<MissionRecord | null> {
    const mission = await missionRepository.findFirst({
      where,
      include: baseInclude,
    });
    return mission ? toMissionRecord(mission as MissionWithRelations) : null;
  },

  async findMissionByClientAndPublisher(clientId: string, publisherId: string): Promise<MissionRecord | null> {
    return this.findOneMissionBy({ clientId, publisherId });
  },

  async findMissionByAnyId(missionId: string): Promise<MissionRecord | null> {
    return this.findOneMissionBy({
      OR: [{ id: missionId }, { oldId: missionId }, { oldIds: { has: missionId } }],
    });
  },

  async findMissionsBy(
    where: Prisma.MissionWhereInput,
    options: { limit?: number; skip?: number; orderBy?: Prisma.MissionOrderByWithRelationInput | Prisma.MissionOrderByWithRelationInput[] } = {}
  ): Promise<MissionRecord[]> {
    const missions = await missionRepository.findMany({
      where,
      include: baseInclude,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.limit ? { take: options.limit } : {}),
      ...(options.skip ? { skip: options.skip } : {}),
    });
    return missions.map((mission) => toMissionRecord(mission as MissionWithRelations));
  },

  async findMissions(filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number }> {
    const where = buildWhere(filters);

    if (filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined) {
      const missions = await missionRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { startAt: Prisma.SortOrder.desc },
      });

      const filtered = missions
        .map((mission) => {
          const record = toMissionRecord(mission as MissionWithRelations);
          const distanceKm = getDistanceFromLatLonInKm(filters.lat, filters.lon, record.location?.lat, record.location?.lon);
          return { record, distanceKm };
        })
        .filter((entry) => entry.distanceKm !== undefined && (entry.distanceKm as number) <= filters.distanceKm!)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

      const total = filtered.length;
      const data = filtered.slice(filters.skip, filters.skip + filters.limit).map(({ record, distanceKm }) => ({
        ...record,
        distanceKm: distanceKm ?? undefined,
      }));

      return { data, total };
    }

    const [missions, total] = await Promise.all([
      missionRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { startAt: Prisma.SortOrder.desc },
        skip: filters.skip,
        take: filters.limit,
      }),
      missionRepository.count(where),
    ]);

    return { data: missions.map((mission) => toMissionRecord(mission as MissionWithRelations)), total };
  },

  async findMissionsWithAggregations(filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number; aggs: MissionSearchAggregations }> {
    const where = buildWhere(filters);

    if (filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined) {
      const missions = await missionRepository.findMany({
        where,
        include: baseInclude,
      });

      const filtered = missions
        .map((mission) => {
          const record = toMissionRecord(mission as MissionWithRelations);
          const distanceKm = getDistanceFromLatLonInKm(filters.lat, filters.lon, record.location?.lat, record.location?.lon);
          return { record, distanceKm };
        })
        .filter((entry) => entry.distanceKm !== undefined && (entry.distanceKm as number) <= filters.distanceKm!)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

      const total = filtered.length;
      const aggs = await buildAggregationsFromRecords(filtered.map(({ record }) => record));
      const data = filtered.slice(filters.skip, filters.skip + filters.limit).map(({ record, distanceKm }) => ({
        ...record,
        distanceKm: distanceKm ?? undefined,
      }));

      return { data, total, aggs };
    }

    const [paginated, total, aggs] = await Promise.all([
      missionRepository.findMany({
        where,
        include: baseInclude,
        skip: filters.skip,
        take: filters.limit,
      }),
      missionRepository.count(where),
      buildAggregations(where),
    ]);

    const data = paginated.map((mission) => toMissionRecord(mission as MissionWithRelations));

    return { data, total, aggs };
  },

  async countMissions(filters: MissionSearchFilters): Promise<number> {
    const where = buildWhere(filters);
    return missionRepository.count(where);
  },

  async countBy(where: Prisma.MissionWhereInput): Promise<number> {
    return missionRepository.count(where);
  },

  async updateMany(where: Prisma.MissionWhereInput, data: Prisma.MissionUpdateInput): Promise<number> {
    const result = await prismaCore.mission.updateMany({ where, data });
    return result.count;
  },

  async findMissionsWithFacets(filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number; facets: MissionFacets }> {
    const where = buildWhere(filters);

    if (filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined) {
      const missions = await missionRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { startAt: Prisma.SortOrder.desc },
      });

      const filtered = missions
        .map((mission) => {
          const record = toMissionRecord(mission as MissionWithRelations);
          const distanceKm = getDistanceFromLatLonInKm(filters.lat, filters.lon, record.location?.lat, record.location?.lon);
          return { record, distanceKm };
        })
        .filter((entry) => entry.distanceKm !== undefined && (entry.distanceKm as number) <= filters.distanceKm!)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

      const total = filtered.length;
      const facets = computeFacetsFromRecords(filtered.map(({ record }) => record));
      const data = filtered.slice(filters.skip, filters.skip + filters.limit).map(({ record, distanceKm }) => ({
        ...record,
        distanceKm: distanceKm ?? undefined,
      }));

      return { data, total, facets };
    }

    const [missions, total] = await Promise.all([
      missionRepository.findMany({
        where,
        include: baseInclude,
        orderBy: { startAt: Prisma.SortOrder.desc },
        skip: filters.skip,
        take: filters.limit,
      }),
      missionRepository.count(where),
    ]);

    const records = missions.map((mission) => toMissionRecord(mission as MissionWithRelations));
    const facets = computeFacetsFromRecords(records);

    return { data: records, total, facets };
  },

  async create(input: MissionCreateInput): Promise<MissionRecord> {
    const id = input.id ?? randomUUID();
    const addresses = mapAddressesForCreate(input.addresses);
    const domains = mapDomainsForCreate(input.domain, input.domainOriginal, input.domainLogo);
    const activities = mapActivitiesForCreate(input.activity);

    const data: Prisma.MissionCreateInput = {
      id,
      clientId: input.clientId,
      publisher: { connect: { id: input.publisherId } },
      title: input.title,
      statusCode: input.statusCode ?? "ACCEPTED",
      description: input.description ?? "",
      descriptionHtml: input.descriptionHtml ?? undefined,
      tags: input.tags ?? [],
      tasks: input.tasks ?? [],
      audience: input.audience ?? [],
      softSkills: input.softSkills ?? input.soft_skills ?? [],
      requirements: input.requirements ?? [],
      romeSkills: input.romeSkills ?? [],
      reducedMobilityAccessible: input.reducedMobilityAccessible ?? undefined,
      closeToTransport: input.closeToTransport ?? undefined,
      openToMinors: input.openToMinors ?? undefined,
      remote: (input.remote as any) ?? undefined,
      schedule: input.schedule ?? undefined,
      duration: input.duration ?? undefined,
      postedAt: input.postedAt ?? undefined,
      startAt: input.startAt ?? undefined,
      endAt: input.endAt ?? undefined,
      priority: input.priority ?? undefined,
      places: input.places ?? undefined,
      placesStatus: input.placesStatus ?? undefined,
      metadata: input.metadata ?? undefined,
      type: (input.type as any) ?? undefined,
      snu: input.snu ?? undefined,
      snuPlaces: input.snuPlaces ?? undefined,
      compensationAmount: input.compensationAmount ?? undefined,
      compensationUnit: input.compensationUnit ?? undefined,
      compensationType: input.compensationType ?? undefined,
      organizationClientId: input.organizationClientId ?? undefined,
      organization: input.organizationId ? { connect: { id: input.organizationId } } : undefined,
      lastSyncAt: input.lastSyncAt ?? undefined,
      applicationUrl: input.applicationUrl ?? undefined,
      statusComment: input.statusComment ?? undefined,
      deletedAt: input.deletedAt ?? undefined,
      lastExportedToPgAt: input.lastExportedToPgAt ?? undefined,
      addresses: addresses.length ? { create: addresses } : undefined,
      domains: domains.length ? { create: domains } : undefined,
      activities: activities.length ? { create: activities } : undefined,
    };

    await missionRepository.create(data);
    const mission = await missionRepository.findFirst({ where: { id }, include: baseInclude });
    if (!mission) {
      throw new Error(`[missionService] Mission ${id} not found after creation`);
    }
    return toMissionRecord(mission as MissionWithRelations);
  },

  async update(id: string, patch: MissionUpdatePatch): Promise<MissionRecord> {
    const addresses = mapAddressesForCreate(patch.addresses);
    const data: Prisma.MissionUpdateInput = {};

    if ("clientId" in patch) {
      data.clientId = patch.clientId ?? undefined;
    }
    if ("publisherId" in patch && patch.publisherId) {
      data.publisher = { connect: { id: patch.publisherId } };
    }
    if ("title" in patch) {
      data.title = patch.title ?? undefined;
    }
    if ("statusCode" in patch) {
      data.statusCode = patch.statusCode ?? undefined;
    }
    if ("description" in patch) {
      data.description = patch.description ?? undefined;
    }
    if ("descriptionHtml" in patch) {
      data.descriptionHtml = patch.descriptionHtml ?? undefined;
    }
    if ("tags" in patch) {
      data.tags = patch.tags ?? [];
    }
    if ("tasks" in patch) {
      data.tasks = patch.tasks ?? [];
    }
    if ("audience" in patch) {
      data.audience = patch.audience ?? [];
    }
    if ("softSkills" in patch || "soft_skills" in patch) {
      data.softSkills = patch.softSkills ?? patch.soft_skills ?? [];
    }
    if ("requirements" in patch) {
      data.requirements = patch.requirements ?? [];
    }
    if ("romeSkills" in patch) {
      data.romeSkills = patch.romeSkills ?? [];
    }
    if ("reducedMobilityAccessible" in patch) {
      data.reducedMobilityAccessible = patch.reducedMobilityAccessible ?? undefined;
    }
    if ("closeToTransport" in patch) {
      data.closeToTransport = patch.closeToTransport ?? undefined;
    }
    if ("openToMinors" in patch) {
      data.openToMinors = patch.openToMinors ?? undefined;
    }
    if ("remote" in patch) {
      data.remote = (patch.remote as any) ?? undefined;
    }
    if ("schedule" in patch) {
      data.schedule = patch.schedule ?? undefined;
    }
    if ("duration" in patch) {
      data.duration = patch.duration ?? undefined;
    }
    if ("postedAt" in patch) {
      data.postedAt = patch.postedAt ?? undefined;
    }
    if ("startAt" in patch) {
      data.startAt = patch.startAt ?? undefined;
    }
    if ("endAt" in patch) {
      data.endAt = patch.endAt ?? undefined;
    }
    if ("priority" in patch) {
      data.priority = patch.priority ?? undefined;
    }
    if ("places" in patch) {
      data.places = patch.places ?? undefined;
    }
    if ("placesStatus" in patch) {
      data.placesStatus = patch.placesStatus ?? undefined;
    }
    if ("metadata" in patch) {
      data.metadata = patch.metadata ?? undefined;
    }
    if ("domain" in patch) {
      const domains = mapDomainsForCreate(patch.domain ?? null, patch.domainOriginal ?? null, patch.domainLogo ?? null);
      data.domains = {
        deleteMany: {},
        ...(domains.length ? { createMany: { data: domains } } : {}),
      };
    }
    if ("domainOriginal" in patch) {
      data.domainOriginal = patch.domainOriginal ?? null;
    }
    if ("domainLogo" in patch) {
      data.domainLogo = patch.domainLogo ?? null;
    }
    if ("activity" in patch) {
      const activities = mapActivitiesForCreate(patch.activity ?? null);
      data.activities = {
        deleteMany: {},
        ...(activities.length ? { createMany: { data: activities } } : {}),
      };
    }
    if ("type" in patch) {
      data.type = (patch.type as any) ?? undefined;
    }
    if ("snu" in patch) {
      data.snu = patch.snu ?? undefined;
    }
    if ("snuPlaces" in patch) {
      data.snuPlaces = patch.snuPlaces ?? undefined;
    }
    if ("compensationAmount" in patch) {
      data.compensationAmount = patch.compensationAmount ?? undefined;
    }
    if ("compensationUnit" in patch) {
      data.compensationUnit = patch.compensationUnit ?? undefined;
    }
    if ("compensationType" in patch) {
      data.compensationType = patch.compensationType ?? undefined;
    }
    if ("organizationClientId" in patch) {
      data.organizationClientId = patch.organizationClientId ?? undefined;
    }
    if ("organizationId" in patch) {
      data.organization = patch.organizationId ? { connect: { id: patch.organizationId } } : { disconnect: true };
    }
    if ("lastSyncAt" in patch) {
      data.lastSyncAt = patch.lastSyncAt ?? undefined;
    }
    if ("applicationUrl" in patch) {
      data.applicationUrl = patch.applicationUrl ?? undefined;
    }
    if ("statusComment" in patch) {
      data.statusComment = patch.statusComment ?? undefined;
    }
    if ("deletedAt" in patch) {
      data.deletedAt = patch.deletedAt ?? undefined;
    }
    if ("lastExportedToPgAt" in patch) {
      data.lastExportedToPgAt = patch.lastExportedToPgAt ?? undefined;
    }

    if ("addresses" in patch) {
      data.addresses = {
        deleteMany: {},
        ...(addresses.length ? { createMany: { data: addresses } } : {}),
      };
    }

    await missionRepository.update(id, data);
    const mission = await missionRepository.findFirst({ where: { id }, include: baseInclude });
    if (!mission) {
      throw new Error(`[missionService] Mission ${id} not found after update`);
    }
    return toMissionRecord(mission as MissionWithRelations);
  },
};

export default missionService;
