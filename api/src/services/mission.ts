import { randomUUID } from "crypto";

import { Mission, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { missionRepository } from "../repositories/mission";
import { organizationRepository } from "../repositories/organization";
import type {
  MissionCreateInput,
  MissionFacets,
  MissionInclude,
  MissionRecord,
  MissionSearchAggregations,
  MissionSearchFilters,
  MissionSelect,
  MissionUpdatePatch,
} from "../types/mission";
import { calculateBoundingBox } from "../utils";
import { buildJobBoardMap, deriveMissionLocation, normalizeMissionAddresses } from "../utils/mission";
import { normalizeOptionalString, normalizeStringList } from "../utils/normalize";
import { publisherService } from "./publisher";

type MissionWithRelations = Mission & {
  publisher?: { name: string | null; url: string | null; logo: string | null } | null;
  domain?: { name: string; logo: string | null } | null;
  activity?: { name: string } | null;
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
    publicId: string | null;
    status: string | null;
    comment: string | null;
    updatedAt: Date | null;
    missionAddressId: string | null;
  }>;
};

const resolveDomainId = async (domainName: string, domainLogo?: string | null): Promise<string> => {
  const name = domainName.trim();
  const logo = domainLogo && domainLogo.trim() ? domainLogo.trim() : null;
  const existing = await prismaCore.domain.findUnique({ where: { name }, select: { id: true, logo: true } });
  if (existing) {
    if (logo && !existing.logo) {
      await prismaCore.domain.update({ where: { id: existing.id }, data: { logo } });
    }
    return existing.id;
  }
  const created = await prismaCore.domain.create({ data: { name, logo: logo ?? undefined } });
  return created.id;
};

const resolveActivityId = async (activityName: string): Promise<string> => {
  const name = activityName.trim();
  const existing = await prismaCore.activity.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    return existing.id;
  }
  const created = await prismaCore.activity.create({ data: { name } });
  return created.id;
};

const toMissionRecord = (mission: MissionWithRelations, moderatedBy: string | null = null): MissionRecord => {
  const addresses = normalizeMissionAddresses(mission.addresses || []) as MissionRecord["addresses"];
  const location = deriveMissionLocation(addresses);
  const primaryAddress = addresses[0] ?? {};

  const org = mission.organization;
  const publisherName = mission.publisher?.name ?? null;
  const publisherLogo = mission.publisher?.logo ?? null;
  const publisherUrl = mission.publisher?.url ?? null;
  const domain = mission.domain;
  const activity = mission.activity;
  const jobBoards = buildJobBoardMap(mission.jobBoards);
  const letudiantJobBoard = jobBoards?.LETUDIANT;

  const softSkills = normalizeStringList(mission.softSkills);

  const moderationTitle = moderatedBy ? (mission.moderationStatuses?.find((moderation) => moderation.publisherId === moderatedBy)?.title ?? null) : null;

  const record: MissionRecord = {
    _id: mission.id,
    id: mission.id,
    clientId: mission.clientId,
    publisherId: mission.publisherId,
    publisherName,
    publisherUrl,
    publisherLogo,
    title: moderationTitle ?? mission.title,
    description: mission.description ?? null,
    descriptionHtml: mission.descriptionHtml ?? null,
    tags: normalizeStringList(mission.tags),
    tasks: normalizeStringList(mission.tasks),
    audience: normalizeStringList(mission.audience),
    softSkills,
    soft_skills: softSkills,
    requirements: normalizeStringList(mission.requirements),
    romeSkills: normalizeStringList(mission.romeSkills),
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
    domain: domain?.name ?? null,
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: domain?.logo ?? null,
    activity: activity?.name ?? null,
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
    organizationUrl: mission.organizationUrl ?? null,
    organizationName: mission.organizationName ?? org?.title ?? null,
    organizationReseaux: mission.organizationReseaux ?? [],
    organizationType: org?.status ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    organizationDescription: mission.organizationDescription ?? null,
    organizationFullAddress: mission.organizationFullAddress ?? null,
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
    jobBoards,
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
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...existingAnd,
      {
        OR: [
          { title: { contains: keywords, mode: "insensitive" } },
          { organization: { title: { contains: keywords, mode: "insensitive" } } },
          { addresses: { some: { city: { contains: keywords, mode: "insensitive" } } } },
          { domain: { is: { name: { contains: keywords, mode: "insensitive" } } } },
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

  const aggregateMissionRelationById = async (field: "domainId" | "activityId", loadNames: (ids: string[]) => Promise<Map<string, string>>) => {
    const rows = await prismaCore.mission.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    });

    const ids = rows.map((row) => String((row as any)[field] ?? "")).filter(isNonEmpty);
    const nameById = ids.length ? await loadNames(ids) : new Map<string, string>();

    return rows
      .map((row) => {
        const id = String((row as any)[field] ?? "");
        return { key: nameById.get(id) ?? "", doc_count: Number((row as any)._count?._all ?? 0) };
      })
      .filter((row) => isNonEmpty(row.key))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  const aggregateMissionDomain = async () => {
    return aggregateMissionRelationById("domainId", async (ids) => {
      const domains = await prismaCore.domain.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      return new Map(domains.map((domain) => [domain.id, domain.name ?? ""]));
    });
  };

  const aggregateMissionActivity = async () => {
    return aggregateMissionRelationById("activityId", async (ids) => {
      const activities = await prismaCore.activity.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      return new Map(activities.map((activity) => [activity.id, activity.name ?? ""]));
    });
  };

  const aggregateAddressField = async (field: "city" | "departmentName") => {
    const rows = await prismaCore.missionAddress.groupBy({
      // Count distinct missions per bucket (a mission can have multiple addresses)
      by: [field, "missionId"],
      where: { mission: where },
      _count: { _all: true },
    });

    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const key = String((row as any)[field] ?? "");
      if (!isNonEmpty(key)) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([key, doc_count]) => ({ key, doc_count }))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  // Run sequentially to avoid exhausting the small Prisma connection pool when many filters are used
  const status = await aggregateMissionField("statusCode");
  const comments = await aggregateMissionField("statusComment");
  const domains = await aggregateMissionDomain();
  const activities = await aggregateMissionActivity();
  const partnersRaw = await aggregateMissionField("publisherId");
  const organizationsRaw = await aggregateMissionField("organizationId");
  const cities = await aggregateAddressField("city");
  const departments = await aggregateAddressField("departmentName");

  const organizationIds = organizationsRaw.map((row) => row.key).filter(isNonEmpty) as string[];
  const organizations = organizationIds.length > 0 ? await organizationRepository.findMany({ where: { id: { in: organizationIds } }, select: { id: true, title: true } }) : [];
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

const hasGeoFilters = (filters: MissionSearchFilters) => filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined;

const mapAddressesForCreate = (addresses?: MissionRecord["addresses"]) => {
  if (!addresses || !addresses.length) {
    return [];
  }
  return addresses.map((address) => ({
    street: normalizeOptionalString(address.street !== undefined && address.street !== null ? String(address.street) : (address.street as any)),
    postalCode: normalizeOptionalString(address.postalCode !== undefined && address.postalCode !== null ? String(address.postalCode) : (address.postalCode as any)),
    departmentName: normalizeOptionalString(
      address.departmentName !== undefined && address.departmentName !== null ? String(address.departmentName) : (address.departmentName as any)
    ),
    departmentCode: normalizeOptionalString(
      address.departmentCode !== undefined && address.departmentCode !== null ? String(address.departmentCode) : (address.departmentCode as any)
    ),
    city: normalizeOptionalString(address.city !== undefined && address.city !== null ? String(address.city) : (address.city as any)),
    region: normalizeOptionalString(address.region !== undefined && address.region !== null ? String(address.region) : (address.region as any)),
    country: normalizeOptionalString(address.country !== undefined && address.country !== null ? String(address.country) : (address.country as any)),
    locationLat: address.location?.lat ?? null,
    locationLon: address.location?.lon ?? null,
    geolocStatus: (address as any).geolocStatus ?? null,
  }));
};

const baseInclude: MissionInclude = { publisher: true, domain: true, activity: true, organization: true, addresses: true, moderationStatuses: true, jobBoards: true };

export const missionService = {
  async findOneMission(id: string, moderatedBy: string | null = null): Promise<MissionRecord | null> {
    const mission = await missionRepository.findFirst({
      where: { id },
      include: baseInclude,
    });
    return mission ? toMissionRecord(mission as MissionWithRelations, moderatedBy) : null;
  },

  async findOneMissionBy(where: Prisma.MissionWhereInput, moderatedBy: string | null = null): Promise<MissionRecord | null> {
    const mission = await missionRepository.findFirst({
      where,
      include: baseInclude,
    });
    return mission ? toMissionRecord(mission as MissionWithRelations, moderatedBy) : null;
  },

  async findMissionByClientAndPublisher(clientId: string, publisherId: string): Promise<MissionRecord | null> {
    return this.findOneMissionBy({ clientId, publisherId });
  },

  async findMissionsBy(
    where: Prisma.MissionWhereInput,
    options: {
      limit?: number;
      skip?: number;
      orderBy?: Prisma.MissionOrderByWithRelationInput | Prisma.MissionOrderByWithRelationInput[]; 
      select?: MissionSelect | null;
      moderationTitle?: boolean;
    } = {}
  ): Promise<MissionRecord[]> {
    const { select, orderBy, limit, skip, moderationTitle } = options;
    const missions = await missionRepository.findMany({
      where,
      select,
      include: select ? undefined : baseInclude,
      ...(orderBy ? { orderBy } : {}),
      ...(limit ? { take: limit } : {}),
      ...(skip ? { skip } : {}),
    });
    return missions.map((mission) => toMissionRecord(mission as MissionWithRelations, moderationTitle));
  },

  async findMissions(filters: MissionSearchFilters, select: MissionSelect | null = null): Promise<{ data: MissionRecord[]; total: number }> {
    const where = buildWhere(filters);

    const [missions, total] = await Promise.all([
      missionRepository.findMany({
        where,
        select,
        include: select ? undefined : baseInclude,
        orderBy: { startAt: Prisma.SortOrder.desc },
        skip: filters.skip,
        take: filters.limit,
      }),
      missionRepository.count(where),
    ]);

    return { data: missions.map((mission) => toMissionRecord(mission as MissionWithRelations, filters.moderationAcceptedFor)), total };
  },

  async findMissionsWithFacets(filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number; facets: MissionFacets }> {
    const where = buildWhere(filters);

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

    const records = missions.map((mission) => toMissionRecord(mission as MissionWithRelations, filters.moderationAcceptedFor));
    const facets = computeFacetsFromRecords(records);

    return { data: records, total, facets };
  },

  async findMissionsWithAggregations(filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number; aggs: MissionSearchAggregations }> {
    const where = buildWhere(filters);

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

    const data = paginated.map((mission) => toMissionRecord(mission as MissionWithRelations, filters.moderationAcceptedFor));

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

  async create(input: MissionCreateInput): Promise<MissionRecord> {
    const id = input.id ?? randomUUID();
    const addresses = mapAddressesForCreate(input.addresses);

    const domainName = input.domain?.trim();
    const activityName = input.activity?.trim();
    const domainId = domainName ? await resolveDomainId(domainName, input.domainLogo ?? null) : null;
    const activityId = activityName ? await resolveActivityId(activityName) : null;
    const data: Prisma.MissionCreateInput = {
      id,
      clientId: input.clientId,
      publisher: { connect: { id: input.publisherId } },
      ...(domainId ? { domain: { connect: { id: domainId } } } : {}),
      ...(activityId ? { activity: { connect: { id: activityId } } } : {}),
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
      domainOriginal: input.domainOriginal ?? undefined,
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
      if (patch.domain) {
        const domainName = patch.domain.trim();
        const domainId = domainName ? await resolveDomainId(domainName, patch.domainLogo ?? null) : null;
        if (!domainId) {
          data.domain = { disconnect: true };
        } else {
          data.domain = { connect: { id: domainId } };
        }
      } else {
        data.domain = { disconnect: true };
      }
    }
    if ("domainOriginal" in patch) {
      data.domainOriginal = patch.domainOriginal ?? null;
    }
    if ("domainLogo" in patch && !("domain" in patch) && patch.domainLogo) {
      const existing = await missionRepository.findById(id);
      if (existing?.domainId) {
        await prismaCore.domain.update({ where: { id: existing.domainId }, data: { logo: patch.domainLogo } });
      }
    }
    if ("activity" in patch) {
      if (patch.activity) {
        const activityName = patch.activity.trim();
        const activityId = activityName ? await resolveActivityId(activityName) : null;
        if (!activityId) {
          data.activity = { disconnect: true };
        } else {
          data.activity = { connect: { id: activityId } };
        }
      } else {
        data.activity = { disconnect: true };
      }
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

    if ("organizationUrl" in patch) {
      data.organizationUrl = patch.organizationUrl ?? undefined;
    }
    if ("organizationName" in patch) {
      data.organizationName = patch.organizationName ?? undefined;
    }
    if ("organizationType" in patch) {
      data.organizationType = patch.organizationType ?? undefined;
    }
    if ("organizationLogo" in patch) {
      data.organizationLogo = patch.organizationLogo ?? undefined;
    }
    if ("organizationDescription" in patch) {
      data.organizationDescription = patch.organizationDescription ?? undefined;
    }
    if ("organizationFullAddress" in patch) {
      data.organizationFullAddress = patch.organizationFullAddress ?? undefined;
    }
    if ("organizationRNA" in patch) {
      data.organizationRNA = patch.organizationRNA ?? undefined;
    }
    if ("organizationSiren" in patch) {
      data.organizationSiren = patch.organizationSiren ?? undefined;
    }
    if ("organizationSiret" in patch) {
      data.organizationSiret = patch.organizationSiret ?? undefined;
    }
    if ("organizationDepartment" in patch) {
      data.organizationDepartment = patch.organizationDepartment ?? undefined;
    }
    if ("organizationDepartmentCode" in patch) {
      data.organizationDepartmentCode = patch.organizationDepartmentCode ?? undefined;
    }
    if ("organizationDepartmentName" in patch) {
      data.organizationDepartmentName = patch.organizationDepartmentName ?? undefined;
    }
    if ("organizationPostCode" in patch) {
      data.organizationPostCode = patch.organizationPostCode ?? undefined;
    }
    if ("organizationCity" in patch) {
      data.organizationCity = patch.organizationCity ?? undefined;
    }
    if ("organizationStatusJuridique" in patch) {
      data.organizationStatusJuridique = patch.organizationStatusJuridique ?? undefined;
    }
    if ("organizationBeneficiaries" in patch) {
      data.organizationBeneficiaries = patch.organizationBeneficiaries ?? undefined;
    }
    if ("organizationActions" in patch) {
      data.organizationActions = patch.organizationActions ?? undefined;
    }
    if ("organizationReseaux" in patch) {
      data.organizationReseaux = patch.organizationReseaux ?? undefined;
    }
    if ("organizationNameVerified" in patch) {
      data.organizationNameVerified = patch.organizationNameVerified ?? undefined;
    }
    if ("organizationRNAVerified" in patch) {
      data.organizationRNAVerified = patch.organizationRNAVerified ?? undefined;
    }
    if ("organizationSirenVerified" in patch) {
      data.organizationSirenVerified = patch.organizationSirenVerified ?? undefined;
    }
    if ("organizationSiretVerified" in patch) {
      data.organizationSiretVerified = patch.organizationSiretVerified ?? undefined;
    }
    if ("organizationAddressVerified" in patch) {
      data.organizationAddressVerified = patch.organizationAddressVerified ?? undefined;
    }
    if ("organizationCityVerified" in patch) {
      data.organizationCityVerified = patch.organizationCityVerified ?? undefined;
    }
    if ("organizationPostalCodeVerified" in patch) {
      data.organizationPostalCodeVerified = patch.organizationPostalCodeVerified ?? undefined;
    }
    if ("organizationDepartmentCodeVerified" in patch) {
      data.organizationDepartmentCodeVerified = patch.organizationDepartmentCodeVerified ?? undefined;
    }
    if ("organizationDepartmentNameVerified" in patch) {
      data.organizationDepartmentNameVerified = patch.organizationDepartmentNameVerified ?? undefined;
    }
    if ("organizationRegionVerified" in patch) {
      data.organizationRegionVerified = patch.organizationRegionVerified ?? undefined;
    }
    if ("organizationVerificationStatus" in patch) {
      data.organizationVerificationStatus = patch.organizationVerificationStatus ?? undefined;
    }
    if ("organisationIsRUP" in patch) {
      data.organisationIsRUP = patch.organisationIsRUP ?? undefined;
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
