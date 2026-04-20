import { randomUUID } from "crypto";

import { Mission, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { missionRepository } from "@/repositories/mission";
import { activityService } from "@/services/activity";
import type {
  MissionCreateInput,
  MissionFacets,
  MissionInclude,
  MissionRecord,
  MissionSearchAggregations,
  MissionSearchFilters,
  MissionSelect,
  MissionUpdatePatch,
} from "@/types/mission";
import { PublisherOrganizationWithRelations } from "@/types/publisher-organization";
import { calculateBoundingBox } from "@/utils";
import { buildJobBoardMap, computeAddressHash, deriveMissionLocation, normalizeMissionAddresses } from "@/utils/mission";
import { normalizeOptionalString, normalizeStringList } from "@/utils/normalize";
import { publisherService } from "./publisher";
import publisherOrganizationService from "./publisher-organization";

type MissionWithRelations = Mission & {
  publisher?: { name: string | null; url: string | null; logo: string | null } | null;
  domain?: { name: string } | null;
  activities?: Array<{ activity: { id: string; name: string } }> | null;
  publisherOrganization?: PublisherOrganizationWithRelations | null;
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

const resolveDomainId = async (domainName: string): Promise<string> => {
  const name = domainName.trim();
  const existing = await prisma.domain.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.domain.create({ data: { name } });
  return created.id;
};

const toMissionRecord = (mission: MissionWithRelations, moderatedBy: string | null = null): MissionRecord => {
  const addresses = normalizeMissionAddresses(mission.addresses || []) as MissionRecord["addresses"];
  const location = deriveMissionLocation(addresses);
  const primaryAddress = addresses[0] ?? {};

  const publisherOrganization = mission.publisherOrganization;
  const publisherName = mission.publisher?.name ?? null;
  const publisherLogo = mission.publisher?.logo ?? null;
  const publisherUrl = mission.publisher?.url ?? null;
  const domain = mission.domain;
  const activityNames = mission.activities?.map((ma) => ma.activity.name).sort() ?? [];
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
    domainLogo: mission.domainLogo ?? null,
    activities: activityNames,
    type: mission.type ?? null,
    snu: mission.snu ?? false,
    snuPlaces: mission.snuPlaces ?? null,
    compensationAmount: mission.compensationAmount ?? null,
    compensationAmountMax: mission.compensationAmountMax ?? null,
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
    publisherOrganizationId: publisherOrganization?.id ?? null,
    organizationClientId: publisherOrganization?.clientId ?? null,
    organizationId: publisherOrganization?.organizationIdVerified ?? null,
    organizationUrl: publisherOrganization?.url ?? null,
    organizationName: publisherOrganization?.name ?? null,
    organizationReseaux: publisherOrganization?.parentOrganizations ?? [],
    organizationType: publisherOrganization?.type ?? null,
    organizationLogo: publisherOrganization?.logo ?? null,
    organizationDescription: publisherOrganization?.description ?? null,
    organizationFullAddress: publisherOrganization?.fullAddress ?? null,
    organizationRNA: publisherOrganization?.rna ?? null,
    organizationSiren: publisherOrganization?.siren ?? null,
    organizationSiret: publisherOrganization?.siret ?? null,
    organizationPostCode: publisherOrganization?.postalCode ?? null,
    organizationCity: publisherOrganization?.city ?? null,
    organizationStatusJuridique: publisherOrganization?.legalStatus ?? null,
    organizationBeneficiaries: publisherOrganization?.beneficiaries ?? [],
    organizationActions: publisherOrganization?.actions ?? [],
    organizationNameVerified: publisherOrganization?.organizationVerified?.title ?? null,
    organizationRNAVerified: publisherOrganization?.organizationVerified?.rna ?? null,
    organizationSirenVerified: publisherOrganization?.organizationVerified?.siren ?? null,
    organizationSiretVerified: publisherOrganization?.organizationVerified?.siret ?? null,
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

  if (filters.activity?.length) {
    where.activities = { some: { activity: { name: { in: filters.activity } } } };
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

  if (filters.organizationRNA?.length || filters.organizationStatusJuridique?.length || filters.organizationName?.length) {
    where.publisherOrganization = {
      ...(filters.organizationRNA?.length ? { rna: { in: filters.organizationRNA } } : {}),
      ...(filters.organizationStatusJuridique?.length ? { legalStatus: { in: filters.organizationStatusJuridique } } : {}),
      ...(filters.organizationName?.length ? { name: { in: filters.organizationName } } : {}),
    };
  }
  if (filters.organizationClientId?.length) {
    if (where.publisherOrganization) {
      where.publisherOrganization["clientId"] = { in: filters.organizationClientId };
    } else {
      where.publisherOrganization = { clientId: { in: filters.organizationClientId } };
    }
  }
  if (filters.organizationIds?.length) {
    where.publisherOrganizationId = { in: filters.organizationIds };
  }
  if (filters.excludePublisherOrganizationIds?.length) {
    if (where.publisherOrganization) {
      where.publisherOrganization["id"] = { notIn: filters.excludePublisherOrganizationIds };
    } else {
      where.publisherOrganization = { id: { notIn: filters.excludePublisherOrganizationIds } };
    }
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

  if (filters.moderationAcceptedFor) {
    const moderationWhere: Prisma.MissionModerationStatusWhereInput = { publisherId: filters.moderationAcceptedFor, status: "ACCEPTED" };
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
          { publisherOrganization: { is: { name: { contains: keywords, mode: "insensitive" } } } },
          { addresses: { some: { city: { contains: keywords, mode: "insensitive" } } } },
          { domain: { is: { name: { contains: keywords, mode: "insensitive" } } } },
        ],
      },
    ];
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

  const activityMap = new Map<string, number>();
  for (const record of records) {
    for (const name of record.activities) {
      activityMap.set(name, (activityMap.get(name) ?? 0) + 1);
    }
  }
  const activity = Array.from(activityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));

  return {
    domain: counts((r) => r.domain),
    activity,
    departmentName: counts((r) => r.departmentName),
  };
};

const isNonEmpty = (value: string | null | undefined) => value !== null && value !== undefined && value !== "";

const buildAggregations = async (where: Prisma.MissionWhereInput): Promise<MissionSearchAggregations> => {
  const aggregateMissionField = async (field: Prisma.MissionScalarFieldEnum) => {
    const rows = await prisma.mission.groupBy({
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

  const aggregateMissionByPublisherOrganization = async () => {
    const rows = (
      await prisma.mission.groupBy({
        by: ["publisherOrganizationId"],
        where,
        _count: { _all: true },
      })
    ).filter((row) => row.publisherOrganizationId !== null) as { publisherOrganizationId: string; _count: { _all: number } }[];

    const organizations = rows.length
      ? await publisherOrganizationService.findMany({ ids: rows.map((row) => row.publisherOrganizationId) }, { select: { id: true, name: true } })
      : [];
    const orgById = new Map(organizations.map((org) => [org.id, org.name ?? ""]));

    return rows
      .map((row) => ({ key: row.publisherOrganizationId, label: orgById.get(row.publisherOrganizationId) ?? "", doc_count: Number(row._count?._all ?? 0) }))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  const aggregateMissionByDomain = async () => {
    const rows = await prisma.mission.groupBy({
      by: ["domainId"],
      where,
      _count: { _all: true },
    });

    const ids = rows.map((row) => row.domainId).filter(isNonEmpty) as string[];
    const domains = ids.length ? await prisma.domain.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nameById = new Map(domains.map((d) => [d.id, d.name ?? ""]));

    return rows
      .map((row) => ({ key: nameById.get(row.domainId ?? "") ?? "", doc_count: Number(row._count?._all ?? 0) }))
      .filter((row) => isNonEmpty(row.key))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  const aggregateAddressField = async (field: "city" | "departmentName") => {
    const rows = await prisma.missionAddress.groupBy({
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

  // Run in parallel - connection pool is now properly sized (20 connections for core DB)
  const [status, comments, domains, activities, partnersRaw, organizations, cities, departments] = await Promise.all([
    aggregateMissionField("statusCode"),
    aggregateMissionField("statusComment"),
    aggregateMissionByDomain(),
    activityService.aggregateByMission(where),
    aggregateMissionField("publisherId"),
    aggregateMissionByPublisherOrganization(),
    aggregateAddressField("city"),
    aggregateAddressField("departmentName"),
  ]);

  const publisherIds = partnersRaw.map((row) => row.key).filter(isNonEmpty) as string[];
  const publishers = publisherIds.length ? await publisherService.findPublishersByIds(publisherIds) : [];
  const publisherById = new Map(publishers.map((publisher) => [publisher._id, publisher]));
  const partners = partnersRaw
    .map((row) => {
      const publisher = publisherById.get(row.key);
      return {
        key: row.key,
        doc_count: row.doc_count,
        label: publisher?.name,
        mission_type: publisher?.missionType === "volontariat_service_civique" ? "volontariat" : (publisher?.missionType ?? "benevolat"),
      };
    })
    .filter((row) => isNonEmpty(row.key))
    .sort((a, b) => b.doc_count - a.doc_count);

  return { status, comments, domains, organizations, activities, cities, departments, partners };
};

const hasGeoFilters = (filters: MissionSearchFilters) => filters.lat !== undefined && filters.lon !== undefined && filters.distanceKm !== undefined;

const mapAddressesForCreate = (addresses?: MissionRecord["addresses"]) => {
  if (!addresses || !addresses.length) {
    return [];
  }
  return addresses.map((address) => {
    const street = normalizeOptionalString(address.street !== undefined && address.street !== null ? String(address.street) : (address.street as any));
    const postalCode = normalizeOptionalString(address.postalCode !== undefined && address.postalCode !== null ? String(address.postalCode) : (address.postalCode as any));
    const city = normalizeOptionalString(address.city !== undefined && address.city !== null ? String(address.city) : (address.city as any));
    const country = normalizeOptionalString(address.country !== undefined && address.country !== null ? String(address.country) : (address.country as any));
    const locationLat = address.location?.lat ?? null;
    const locationLon = address.location?.lon ?? null;
    return {
      addressHash: computeAddressHash({ street, city, postalCode, country, location: locationLat != null && locationLon != null ? { lat: locationLat, lon: locationLon } : null }),
      street,
      postalCode,
      departmentName: normalizeOptionalString(
        address.departmentName !== undefined && address.departmentName !== null ? String(address.departmentName) : (address.departmentName as any)
      ),
      departmentCode: normalizeOptionalString(
        address.departmentCode !== undefined && address.departmentCode !== null ? String(address.departmentCode) : (address.departmentCode as any)
      ),
      city,
      region: normalizeOptionalString(address.region !== undefined && address.region !== null ? String(address.region) : (address.region as any)),
      country,
      locationLat,
      locationLon,
      geolocStatus: (address as any).geolocStatus ?? null,
    };
  });
};

const baseInclude: MissionInclude = {
  publisher: true,
  domain: true,
  activities: { include: { activity: { select: { id: true, name: true } } } },
  publisherOrganization: { include: { organizationVerified: { select: { title: true, rna: true, siren: true, siret: true } } } },
  addresses: true,
  moderationStatuses: true,
  jobBoards: true,
};

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
      moderatedBy?: string | null;
    } = {}
  ): Promise<MissionRecord[]> {
    const missions = await missionRepository.findMany({
      where,
      include: options.select ? undefined : baseInclude,
      select: options.select ?? undefined,
      ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      ...(options.limit ? { take: options.limit } : {}),
      ...(options.skip ? { skip: options.skip } : {}),
    });
    return missions.map((mission) => toMissionRecord(mission as MissionWithRelations, options.moderatedBy));
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
    const result = await prisma.mission.updateMany({ where, data });
    return result.count;
  },

  async create(input: MissionCreateInput): Promise<MissionRecord> {
    const id = input.id ?? randomUUID();
    const rawAddresses = mapAddressesForCreate(input.addresses);
    const seenHashes = new Set<string>();
    const addresses = rawAddresses.filter((addr) => {
      if (seenHashes.has(addr.addressHash)) {
        return false;
      }
      seenHashes.add(addr.addressHash);
      return true;
    });
    const publisherOrganizationId = normalizeOptionalString(input.publisherOrganizationId ?? undefined);

    const domainName = input.domain?.trim();
    const domainId = domainName ? await resolveDomainId(domainName) : null;
    const activityIds = input.activities?.length ? await activityService.getOrCreateActivities(input.activities) : [];
    const data: Prisma.MissionUncheckedCreateInput = {
      id,
      clientId: input.clientId,
      publisherId: input.publisherId,
      domainId: domainId ?? null,
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
      domainLogo: input.domainLogo ?? undefined,
      type: (input.type as any) ?? undefined,
      snu: input.snu ?? undefined,
      snuPlaces: input.snuPlaces ?? undefined,
      compensationAmount: input.compensationAmount ?? undefined,
      compensationAmountMax: input.compensationAmountMax ?? undefined,
      compensationUnit: input.compensationUnit ?? undefined,
      compensationType: input.compensationType ?? undefined,
      lastSyncAt: input.lastSyncAt ?? undefined,
      applicationUrl: input.applicationUrl ?? undefined,
      statusComment: input.statusComment ?? undefined,
      deletedAt: input.deletedAt ?? undefined,
      lastExportedToPgAt: input.lastExportedToPgAt ?? undefined,
      addresses: addresses.length ? { create: addresses } : undefined,
      publisherOrganizationId: publisherOrganizationId ?? undefined,
    };

    await missionRepository.createUnchecked(data);

    await activityService.addMissionActivities(id, activityIds);

    const mission = await missionRepository.findFirst({ where: { id }, include: baseInclude });
    if (!mission) {
      throw new Error(`[missionService] Mission ${id} not found after creation`);
    }
    return toMissionRecord(mission as MissionWithRelations);
  },

  async update(id: string, patch: MissionUpdatePatch): Promise<MissionRecord> {
    const addresses = mapAddressesForCreate(patch.addresses);
    const data: Prisma.MissionUncheckedUpdateInput = {};

    if ("clientId" in patch) {
      data.clientId = patch.clientId ?? undefined;
    }
    if ("publisherId" in patch && patch.publisherId) {
      data.publisherId = patch.publisherId;
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
        const domainId = domainName ? await resolveDomainId(domainName) : null;
        data.domainId = domainId;
      } else {
        data.domainId = null;
      }
    }
    if ("domainOriginal" in patch) {
      data.domainOriginal = patch.domainOriginal ?? null;
    }
    if ("domainLogo" in patch) {
      data.domainLogo = patch.domainLogo ?? null;
    }
    if ("activities" in patch) {
      const activityIds = patch.activities?.length ? await activityService.getOrCreateActivities(patch.activities) : [];
      await activityService.replaceMissionActivities(id, activityIds);
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
    if ("compensationAmountMax" in patch) {
      data.compensationAmountMax = patch.compensationAmountMax ?? undefined;
    }
    if ("compensationUnit" in patch) {
      data.compensationUnit = patch.compensationUnit ?? undefined;
    }
    if ("compensationType" in patch) {
      data.compensationType = patch.compensationType ?? undefined;
    }
    if ("publisherOrganizationId" in patch) {
      data.publisherOrganizationId = patch.publisherOrganizationId ?? undefined;
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
      data.deletedAt = patch.deletedAt === undefined ? undefined : patch.deletedAt;
    }
    if ("lastExportedToPgAt" in patch) {
      data.lastExportedToPgAt = patch.lastExportedToPgAt ?? undefined;
    }

    if ("addresses" in patch) {
      const addressesUpdate: Prisma.MissionAddressUncheckedUpdateManyWithoutMissionNestedInput = { deleteMany: {} };
      if (addresses.length) {
        addressesUpdate.upsert = addresses.map((addr) => ({
          where: { missionId_addressHash: { missionId: id, addressHash: addr.addressHash } },
          create: addr,
          update: addr,
        }));
        addressesUpdate.deleteMany = { addressHash: { notIn: addresses.map((a) => a.addressHash) } };
      }
      data.addresses = addressesUpdate;
    }

    await missionRepository.updateUnchecked(id, data);
    const mission = await missionRepository.findFirst({ where: { id }, include: baseInclude });
    if (!mission) {
      throw new Error(`[missionService] Mission ${id} not found after update`);
    }
    return toMissionRecord(mission as MissionWithRelations);
  },
};

export default missionService;
