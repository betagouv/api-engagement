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
import { buildJobBoardMap, deriveMissionLocation, normalizeMissionAddresses } from "../utils/mission";
import { normalizeOptionalString, normalizeStringList } from "../utils/normalize";
import { buildWhere, buildWhereWithoutGeo, findMissionIdsInBoundingBox, hasGeoFilters } from "./mission-search-filters";
import { publisherService } from "./publisher";

type MissionWithRelations = Mission & {
  publisher?: { name: string | null; url: string | null; logo: string | null } | null;
  domain?: { name: string } | null;
  activity?: { name: string } | null;
  publisherOrganization?: {
    organizationClientId: string;
    organizationName: string | null;
    organizationUrl: string | null;
    organizationType: string | null;
    organizationLogo: string | null;
    organizationDescription: string | null;
    organizationFullAddress: string | null;
    organizationRNA: string | null;
    organizationSiren: string | null;
    organizationSiret: string | null;
    organizationDepartment: string | null;
    organizationDepartmentCode: string | null;
    organizationDepartmentName: string | null;
    organizationPostCode: string | null;
    organizationCity: string | null;
    organizationStatusJuridique: string | null;
    organizationBeneficiaries: string[];
    organizationActions: string[];
    organizationReseaux: string[];
    organizationNameVerified: string | null;
    organizationRNAVerified: string | null;
    organizationSirenVerified: string | null;
    organizationSiretVerified: string | null;
    organizationAddressVerified: string | null;
    organizationCityVerified: string | null;
    organizationPostalCodeVerified: string | null;
    organizationDepartmentCodeVerified: string | null;
    organizationDepartmentNameVerified: string | null;
    organizationRegionVerified: string | null;
    organizationVerificationStatus: string | null;
    organisationIsRUP: boolean | null;
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

const resolveDomainId = async (domainName: string): Promise<string> => {
  const name = domainName.trim();
  const existing = await prismaCore.domain.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    return existing.id;
  }
  const created = await prismaCore.domain.create({ data: { name } });
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

  const publisherOrganization = mission.publisherOrganization;
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
    domainLogo: mission.domainLogo ?? null,
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
    organizationUrl: publisherOrganization?.organizationUrl ?? null,
    organizationName: publisherOrganization?.organizationName ?? null,
    organizationReseaux: publisherOrganization?.organizationReseaux ?? [],
    organizationType: publisherOrganization?.organizationType ?? null,
    organizationLogo: publisherOrganization?.organizationLogo ?? null,
    organizationDescription: publisherOrganization?.organizationDescription ?? null,
    organizationFullAddress: publisherOrganization?.organizationFullAddress ?? null,
    organizationRNA: publisherOrganization?.organizationRNA ?? null,
    organizationSiren: publisherOrganization?.organizationSiren ?? null,
    organizationSiret: publisherOrganization?.organizationSiret ?? null,
    organizationDepartment: publisherOrganization?.organizationDepartment ?? null,
    organizationDepartmentCode: publisherOrganization?.organizationDepartmentCode ?? null,
    organizationDepartmentName: publisherOrganization?.organizationDepartmentName ?? null,
    organizationPostCode: publisherOrganization?.organizationPostCode ?? null,
    organizationCity: publisherOrganization?.organizationCity ?? null,
    organizationStatusJuridique: publisherOrganization?.organizationStatusJuridique ?? null,
    organizationBeneficiaries: publisherOrganization?.organizationBeneficiaries ?? [],
    organizationActions: publisherOrganization?.organizationActions ?? [],
    organizationNameVerified: publisherOrganization?.organizationNameVerified ?? null,
    organizationRNAVerified: publisherOrganization?.organizationRNAVerified ?? null,
    organizationSirenVerified: publisherOrganization?.organizationSirenVerified ?? null,
    organizationSiretVerified: publisherOrganization?.organizationSiretVerified ?? null,
    organizationAddressVerified: publisherOrganization?.organizationAddressVerified ?? null,
    organizationCityVerified: publisherOrganization?.organizationCityVerified ?? null,
    organizationPostalCodeVerified: publisherOrganization?.organizationPostalCodeVerified ?? null,
    organizationDepartmentCodeVerified: publisherOrganization?.organizationDepartmentCodeVerified ?? null,
    organizationDepartmentNameVerified: publisherOrganization?.organizationDepartmentNameVerified ?? null,
    organizationRegionVerified: publisherOrganization?.organizationRegionVerified ?? null,
    organizationVerificationStatus: publisherOrganization?.organizationVerificationStatus ?? null,
    organisationIsRUP: publisherOrganization?.organisationIsRUP ?? null,
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

export { buildWhere } from "./mission-search-filters";

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

const baseInclude: MissionInclude = { publisher: true, domain: true, activity: true, publisherOrganization: true, addresses: true, moderationStatuses: true, jobBoards: true };

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
    // Use GiST-optimized query when geo filters are present
    if (hasGeoFilters(filters)) {
      // First, get mission IDs in bounding box using fast GiST index
      const geoResult = await findMissionIdsInBoundingBox(filters);

      if (geoResult && geoResult.ids.length > 0) {
        // Build where clause without geo filters (GiST already handled that)
        // and add constraint to only include missions from the GiST result
        const baseWhere = buildWhereWithoutGeo(filters);
        const whereWithIds: Prisma.MissionWhereInput = {
          ...baseWhere,
          id: { in: geoResult.ids },
        };

        // Fetch missions and count with all other filters applied
        const [missions, total] = await Promise.all([
          missionRepository.findMany({
            where: whereWithIds,
            select,
            include: select ? undefined : baseInclude,
            orderBy: { startAt: Prisma.SortOrder.desc },
          }),
          missionRepository.count(whereWithIds),
        ]);

        return {
          data: missions.map((mission) => toMissionRecord(mission as MissionWithRelations, filters.moderationAcceptedFor)),
          total,
        };
      }

      // No missions in bounding box
      return { data: [], total: 0 };
    }

    // Standard query without geo filters
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
    // Use GiST-optimized query when geo filters are present
    if (hasGeoFilters(filters)) {
      const geoResult = await findMissionIdsInBoundingBox({
        ...filters,
        limit: Number.MAX_SAFE_INTEGER, // We need all IDs for accurate count
        skip: 0,
      });

      if (geoResult && geoResult.ids.length > 0) {
        const baseWhere = buildWhereWithoutGeo(filters);
        const whereWithIds: Prisma.MissionWhereInput = {
          ...baseWhere,
          id: { in: geoResult.ids },
        };
        return missionRepository.count(whereWithIds);
      }

      return 0;
    }

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
    const organizationClientId = normalizeOptionalString(input.organizationClientId ?? undefined);

    const domainName = input.domain?.trim();
    const activityName = input.activity?.trim();
    const domainId = domainName ? await resolveDomainId(domainName) : null;
    const activityId = activityName ? await resolveActivityId(activityName) : null;
    const data: Prisma.MissionUncheckedCreateInput = {
      id,
      clientId: input.clientId,
      publisherId: input.publisherId,
      domainId: domainId ?? null,
      activityId: activityId ?? null,
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
      compensationUnit: input.compensationUnit ?? undefined,
      compensationType: input.compensationType ?? undefined,
      organizationClientId: organizationClientId ?? undefined,
      organizationId: input.organizationId ?? undefined,
      lastSyncAt: input.lastSyncAt ?? undefined,
      applicationUrl: input.applicationUrl ?? undefined,
      statusComment: input.statusComment ?? undefined,
      deletedAt: input.deletedAt ?? undefined,
      lastExportedToPgAt: input.lastExportedToPgAt ?? undefined,
      addresses: addresses.length ? { create: addresses } : undefined,
    };

    await missionRepository.createUnchecked(data);
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
    if ("activity" in patch) {
      if (patch.activity) {
        const activityName = patch.activity.trim();
        const activityId = activityName ? await resolveActivityId(activityName) : null;
        data.activityId = activityId;
      } else {
        data.activityId = null;
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
      const normalized = normalizeOptionalString(patch.organizationClientId ?? undefined);
      data.organizationClientId = normalized ?? null;
    }
    if ("organizationId" in patch) {
      data.organizationId = patch.organizationId ?? null;
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

    await missionRepository.updateUnchecked(id, data);
    const mission = await missionRepository.findFirst({ where: { id }, include: baseInclude });
    if (!mission) {
      throw new Error(`[missionService] Mission ${id} not found after update`);
    }
    return toMissionRecord(mission as MissionWithRelations);
  },
};

export default missionService;
