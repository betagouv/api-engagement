import { randomUUID } from "crypto";
import mongoose from "mongoose";

import type { JobBoardId, Prisma, PrismaClient } from "../../src/db/core";
import { asString, asStringArray, toMongoObjectIdString } from "./utils/cast";
import { compareBooleans, compareDates, compareJsons, compareNumbers, compareStringArrays, compareStrings } from "./utils/compare";
import { normalizeDate, normalizeNumber } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const SCRIPT_NAME = "MigrateMissions";
const BATCH_SIZE = 200;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), SCRIPT_NAME);
loadEnvironment(options, __dirname, SCRIPT_NAME);

const missionRemoteValues: Prisma.MissionRemote[] = ["no", "possible", "full"];
const missionPlacesStatusValues: Prisma.MissionPlacesStatus[] = ["ATTRIBUTED_BY_API", "GIVEN_BY_PARTNER"];
const missionTypeValues: Prisma.MissionType[] = ["benevolat", "volontariat_service_civique", "volontariat_sapeurs_pompiers"];
const compensationUnitValues: Prisma.MissionCompensationUnit[] = ["hour", "day", "month", "year"];
const compensationTypeValues: Prisma.MissionCompensationType[] = ["gross", "net"];
const moderationStatusesValues: Array<Prisma.ModerationEventStatus | null> = ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", null];
const jobBoardIds: JobBoardId[] = ["LETUDIANT", "JOBTEASER", "LEBONCOIN"];
const LETUDIANT_JOB_BOARD_ID: JobBoardId = "LETUDIANT";
const LEBONCOIN_JOB_BOARD_ID: JobBoardId = "LEBONCOIN";
const JOBTEASER_JOB_BOARD_ID: JobBoardId = "JOBTEASER";

type MongoMissionDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  clientId?: unknown;
  publisherId?: unknown;
  organizationId?: unknown;
  organizationClientId?: unknown;
  title?: unknown;
  description?: unknown;
  descriptionHtml?: unknown;
  tags?: unknown;
  tasks?: unknown;
  audience?: unknown;
  softSkills?: unknown;
  soft_skills?: unknown;
  requirements?: unknown;
  romeSkills?: unknown;
  reducedMobilityAccessible?: unknown;
  closeToTransport?: unknown;
  openToMinors?: unknown;
  remote?: unknown;
  schedule?: unknown;
  duration?: unknown;
  postedAt?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  priority?: unknown;
  places?: unknown;
  placesStatus?: unknown;
  metadata?: unknown;
  domain?: unknown;
  domainOriginal?: unknown;
  domainLogo?: unknown;
  activity?: unknown;
  type?: unknown;
  snu?: unknown;
  snuPlaces?: unknown;
  compensationAmount?: unknown;
  compensationUnit?: unknown;
  compensationType?: unknown;
  adresse?: unknown;
  address?: unknown;
  postalCode?: unknown;
  departmentName?: unknown;
  departmentCode?: unknown;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  location?: { lat?: number; lon?: number } | null;
  addresses?: unknown;
  lastSyncAt?: unknown;
  applicationUrl?: unknown;
  statusCode?: unknown;
  statusComment?: unknown;
  deletedAt?: unknown;
  letudiantPublicId?: unknown;
  letudiantUpdatedAt?: unknown;
  letudiantError?: unknown;
  lastExportedToPgAt?: unknown;
  leboncoinStatus?: unknown;
  leboncoinUrl?: unknown;
  leboncoinComment?: unknown;
  leboncoinUpdatedAt?: unknown;
  jobteaserStatus?: unknown;
  jobteaserUrl?: unknown;
  jobteaserComment?: unknown;
  jobteaserUpdatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  organizationDepartment?: unknown;
  organizationCity?: unknown;
  organizationCountry?: unknown;
  [key: `moderation_${string}_status`]: unknown;
};

type NormalizedMissionData = {
  log: { id: string; clientId: string; publisherId: string; title: string; statusCode: Prisma.MissionStatusCode };
  mission: Prisma.MissionUncheckedCreateInput;
  update: Prisma.MissionUncheckedUpdateInput;
  addresses: Prisma.MissionAddressCreateManyInput[];
  domains: Prisma.MissionDomainCreateManyInput[];
  activities: Prisma.MissionActivityCreateManyInput[];
  moderationStatuses: Prisma.MissionModerationStatusCreateManyInput[];
  jobBoards: Prisma.MissionJobBoardCreateManyInput[];
};

type ComparableMission = {
  mission: {
    id: string;
    clientId: string;
    publisherId: string;
    title: string;
    statusCode: Prisma.MissionStatusCode;
    statusComment: string | null;
    description: string | null;
    descriptionHtml: string | null;
    tags: string[];
    tasks: string[];
    audience: string[];
    softSkills: string[];
    requirements: string[];
    romeSkills: string[];
    reducedMobilityAccessible: boolean | null;
    closeToTransport: boolean | null;
    openToMinors: boolean | null;
    remote: Prisma.MissionRemote | null;
    schedule: string | null;
    duration: number | null;
    postedAt: Date | null;
    startAt: Date | null;
    endAt: Date | null;
    priority: string | null;
    places: number | null;
    placesStatus: Prisma.MissionPlacesStatus | null;
    metadata: string | null;
    domainOriginal: string | null;
    domainLogo: string | null;
    type: Prisma.MissionType | null;
    snu: boolean;
    snuPlaces: number | null;
    compensationAmount: number | null;
    compensationUnit: Prisma.MissionCompensationUnit | null;
    compensationType: Prisma.MissionCompensationType | null;
    organizationClientId: string | null;
    organizationId: string | null;
    lastSyncAt: Date | null;
    applicationUrl: string | null;
    deletedAt: Date | null;
    lastExportedToPgAt: Date | null;
  };
  addresses: Array<{
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
  domains: Array<{ value: string; original: string | null; logo: string | null }>;
  activities: Array<{ value: string }>;
  moderationStatuses: Array<{
    publisherId: string;
    status: Prisma.ModerationEventStatus | null;
    comment: string | null;
    note: string | null;
    title: string | null;
    createdAt: Date | null;
  }>;
  jobBoards: Array<{
    jobBoardId: JobBoardId;
    missionAddressId: string | null;
    publicId: string;
    status: string | null;
    comment: string | null;
    updatedAt: Date | null;
  }>;
};

const normalizeStatus = (status?: string | null): Prisma.MissionStatusCode => {
  if (!status) return "ACCEPTED";
  return status === "REFUSED" ? "REFUSED" : "ACCEPTED";
};

const normalizeEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (typeof value === "string") {
    const str = value.trim();
    return str ? [str] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    const str = asString(entry);
    if (str) {
      unique.add(str);
    }
  }
  return Array.from(unique);
};

const normalizeYesNoBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "yes") return true;
  if (normalized === "no") return false;
  return null;
};

const normalizeAddresses = (
  doc: MongoMissionDocument
): Array<{
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
}> => {
  const fromArray = Array.isArray(doc.addresses)
    ? (doc.addresses as any[]).map((address) => ({
        id: randomUUID(),
        street: asString(address?.street),
        postalCode: asString(address?.postalCode),
        departmentName: asString(address?.departmentName),
        departmentCode: asString(address?.departmentCode),
        city: asString(address?.city),
        region: asString(address?.region),
        country: asString(address?.country),
        locationLat: typeof address?.location?.lat === "number" ? address.location.lat : null,
        locationLon: typeof address?.location?.lon === "number" ? address.location.lon : null,
        geolocStatus: asString(address?.geolocStatus),
      }))
    : [];

  if (fromArray.length) {
    return fromArray;
  }

  if (doc.address || doc.adresse || doc.city || doc.country) {
    return [
      {
        id: randomUUID(),
        street: asString(doc.address) ?? asString(doc.adresse),
        postalCode: asString(doc.postalCode),
        departmentName: asString(doc.departmentName),
        departmentCode: asString(doc.departmentCode),
        city: asString(doc.city),
        region: asString(doc.region),
        country: asString(doc.country),
        locationLat: typeof doc.location?.lat === "number" ? doc.location.lat : null,
        locationLon: typeof doc.location?.lon === "number" ? doc.location.lon : null,
        geolocStatus: null,
      },
    ];
  }

  return [];
};

const formatLocalisation = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(", ") || "France";

const computeLetudiantLocalisations = (
  mission: { remote: Prisma.MissionRemote | null; addresses: NormalizedMissionData["addresses"]; organizationCity?: string | null; organizationDepartment?: string | null; organizationCountry?: string | null }
): Array<{ missionAddressId: string | null; localisationKey: string }> => {
  if (mission.remote === "full" || mission.addresses.length === 0) {
    const formatted = formatLocalisation([mission.organizationCity, mission.organizationDepartment, mission.organizationCountry ?? "France"]);
    return [{ missionAddressId: null, localisationKey: mission.remote === "full" ? "A distance" : formatted }];
  }

  const seenCities = new Set<string>();
  const entries: Array<{ missionAddressId: string | null; localisationKey: string }> = [];

  for (const address of mission.addresses) {
    const city = address.city ?? "";
    if (seenCities.has(city)) continue;
    seenCities.add(city);
    const localisationKey = formatLocalisation([address.city, address.departmentName, address.country ?? "France"]);
    entries.push({ missionAddressId: address.id ?? null, localisationKey });
  }

  return entries;
};

const extractModerationStatuses = (
  doc: MongoMissionDocument
): Array<{
  publisherId: string;
  status: Prisma.ModerationEventStatus | null;
  comment: string | null;
  note: string | null;
  title: string | null;
  createdAt: Date | null;
}> => {
  const entries: Array<{
    publisherId: string;
    status: Prisma.ModerationEventStatus | null;
    comment: string | null;
    note: string | null;
    title: string | null;
    createdAt: Date | null;
  }> = [];

  Object.keys(doc || {}).forEach((key) => {
    const match = key.match(/^moderation_(.+)_status$/);
    if (!match) return;
    const publisherId = match[1];
    const rawStatus = asString((doc as any)[key]);
    const status = normalizeEnum(rawStatus, moderationStatusesValues) ?? null;
    const comment = asString((doc as any)[`moderation_${publisherId}_comment`]);
    const note = asString((doc as any)[`moderation_${publisherId}_note`]);
    const title = asString((doc as any)[`moderation_${publisherId}_title`]);
    const createdAt = normalizeDate((doc as any)[`moderation_${publisherId}_date`]);
    entries.push({
      publisherId,
      status,
      comment,
      note,
      title,
      createdAt: createdAt ?? null,
    });
  });

  return entries;
};

const buildJobBoards = (
  doc: MongoMissionDocument,
  missionId: string,
  addresses: NormalizedMissionData["addresses"],
  remote: Prisma.MissionRemote | null
): Prisma.MissionJobBoardCreateManyInput[] => {
  const jobBoards: Prisma.MissionJobBoardCreateManyInput[] = [];
  const letudiantPublicId = typeof doc.letudiantPublicId === "object" && doc.letudiantPublicId !== null ? (doc.letudiantPublicId as Record<string, unknown>) : null;

  if (letudiantPublicId) {
    const localisations = computeLetudiantLocalisations({
      remote,
      addresses,
      organizationCity: asString(doc.organizationCity),
      organizationDepartment: asString(doc.organizationDepartment),
      organizationCountry: asString(doc.organizationCountry),
    });
    const letudiantUpdatedAt = normalizeDate(doc.letudiantUpdatedAt);
    const letudiantError = asString(doc.letudiantError);
    for (const entry of localisations) {
      const legacyKey = entry.localisationKey.split(",")[0];
      const publicId = letudiantPublicId[entry.localisationKey] ?? letudiantPublicId[legacyKey];
      if (typeof publicId === "string" && publicId.trim()) {
        jobBoards.push({
          id: randomUUID(),
          jobBoardId: LETUDIANT_JOB_BOARD_ID,
          missionId,
          missionAddressId: entry.missionAddressId,
          publicId,
          status: null,
          comment: letudiantError ?? null,
          createdAt: letudiantUpdatedAt ?? undefined,
          updatedAt: letudiantUpdatedAt ?? undefined,
        });
      }
    }
  }

  const leboncoinUrl = asString(doc.leboncoinUrl);
  const leboncoinStatus = asString(doc.leboncoinStatus);
  const leboncoinComment = asString(doc.leboncoinComment);
  const leboncoinUpdatedAt = normalizeDate(doc.leboncoinUpdatedAt);
  if (leboncoinUrl || leboncoinStatus || leboncoinComment) {
    jobBoards.push({
      id: randomUUID(),
      jobBoardId: LEBONCOIN_JOB_BOARD_ID,
      missionId,
      missionAddressId: null,
      publicId: leboncoinUrl ?? missionId,
      status: leboncoinStatus ?? null,
      comment: leboncoinComment ?? null,
      createdAt: leboncoinUpdatedAt ?? undefined,
      updatedAt: leboncoinUpdatedAt ?? undefined,
    });
  }

  const jobteaserUrl = asString(doc.jobteaserUrl);
  const jobteaserStatus = asString(doc.jobteaserStatus);
  const jobteaserComment = asString(doc.jobteaserComment);
  const jobteaserUpdatedAt = normalizeDate(doc.jobteaserUpdatedAt);
  if (jobteaserUrl || jobteaserStatus || jobteaserComment) {
    jobBoards.push({
      id: randomUUID(),
      jobBoardId: JOBTEASER_JOB_BOARD_ID,
      missionId,
      missionAddressId: null,
      publicId: jobteaserUrl ?? missionId,
      status: jobteaserStatus ?? null,
      comment: jobteaserComment ?? null,
      createdAt: jobteaserUpdatedAt ?? undefined,
      updatedAt: jobteaserUpdatedAt ?? undefined,
    });
  }

  return jobBoards;
};

const normalizeMission = (doc: MongoMissionDocument): NormalizedMissionData => {
  const id = toMongoObjectIdString(doc._id) ?? asString(doc.id);
  if (!id) {
    throw new Error(`[${SCRIPT_NAME}] Mission without valid identifier`);
  }

  const clientId = asString(doc.clientId);
  const publisherId = asString(doc.publisherId);
  const title = asString(doc.title);

  if (!clientId || !publisherId || !title) {
    throw new Error(`[${SCRIPT_NAME}] Mission ${id} is missing clientId, publisherId or title`);
  }

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const addresses = normalizeAddresses(doc);
  const moderationStatuses = extractModerationStatuses(doc);
  const domain = asString(doc.domain);
  const domainOriginal = asString(doc.domainOriginal);
  const domainLogo = asString(doc.domainLogo);
  const activity = asString(doc.activity);

  const mission: Prisma.MissionUncheckedCreateInput = {
    id,
    clientId,
    publisherId,
    title,
    statusCode: normalizeStatus(asString(doc.statusCode)),
    description: asString(doc.description) ?? undefined,
    descriptionHtml: asString(doc.descriptionHtml) ?? undefined,
    tags: toStringArray(doc.tags),
    tasks: toStringArray(doc.tasks),
    audience: toStringArray(doc.audience),
    softSkills: toStringArray(doc.softSkills ?? doc.soft_skills),
    requirements: toStringArray(doc.requirements),
    romeSkills: toStringArray(doc.romeSkills),
    reducedMobilityAccessible: normalizeYesNoBoolean(doc.reducedMobilityAccessible) ?? undefined,
    closeToTransport: normalizeYesNoBoolean(doc.closeToTransport) ?? undefined,
    openToMinors: normalizeYesNoBoolean(doc.openToMinors) ?? undefined,
    remote: normalizeEnum(asString(doc.remote), missionRemoteValues),
    schedule: asString(doc.schedule) ?? undefined,
    duration: normalizeNumber(doc.duration) ?? undefined,
    postedAt: normalizeDate(doc.postedAt) ?? undefined,
    startAt: normalizeDate(doc.startAt) ?? undefined,
    endAt: normalizeDate(doc.endAt) ?? undefined,
    priority: asString(doc.priority) ?? undefined,
    places: normalizeNumber(doc.places) ?? undefined,
    placesStatus: normalizeEnum(asString(doc.placesStatus), missionPlacesStatusValues),
    metadata: asString(doc.metadata) ?? undefined,
    domainOriginal: domainOriginal ?? undefined,
    domainLogo: domainLogo ?? undefined,
    type: normalizeEnum(asString(doc.type), missionTypeValues),
    snu: !!doc.snu,
    snuPlaces: normalizeNumber(doc.snuPlaces) ?? undefined,
    compensationAmount: normalizeNumber(doc.compensationAmount) ?? undefined,
    compensationUnit: normalizeEnum(asString(doc.compensationUnit), compensationUnitValues),
    compensationType: normalizeEnum(asString(doc.compensationType), compensationTypeValues),
    organizationClientId: asString(doc.organizationClientId) ?? undefined,
    organizationId: asString(doc.organizationId) ?? undefined,
    lastSyncAt: normalizeDate(doc.lastSyncAt) ?? undefined,
    applicationUrl: asString(doc.applicationUrl) ?? undefined,
    statusComment: asString(doc.statusComment) ?? undefined,
    deletedAt: normalizeDate(doc.deletedAt) ?? undefined,
    lastExportedToPgAt: normalizeDate(doc.lastExportedToPgAt) ?? undefined,
    createdAt,
  };

  const domainsData: Prisma.MissionDomainCreateManyInput[] = domain
    ? [
        {
          id: randomUUID(),
          missionId: id,
          value: domain,
          original: domainOriginal ?? null,
          logo: domainLogo ?? null,
        },
      ]
    : [];

  const activitiesData: Prisma.MissionActivityCreateManyInput[] = activity
    ? [
        {
          id: randomUUID(),
          missionId: id,
          value: activity,
        },
      ]
    : [];

  const update: Prisma.MissionUncheckedUpdateInput = {
    ...mission,
    id: undefined,
    createdAt: undefined,
  };

  const addressesData: Prisma.MissionAddressCreateManyInput[] = addresses.map((address) => ({
    id: address.id,
    missionId: id,
    street: address.street,
    postalCode: address.postalCode,
    departmentName: address.departmentName,
    departmentCode: address.departmentCode,
    city: address.city,
    region: address.region,
    country: address.country,
    locationLat: address.locationLat,
    locationLon: address.locationLon,
    geolocStatus: address.geolocStatus,
  }));

  const moderationStatusesData: Prisma.MissionModerationStatusCreateManyInput[] = moderationStatuses.map((entry) => ({
    id: randomUUID(),
    missionId: id,
    publisherId: entry.publisherId,
    status: entry.status,
    comment: entry.comment,
    note: entry.note,
    title: entry.title,
    createdAt: entry.createdAt ?? createdAt,
  }));

  const jobBoards = buildJobBoards(doc, id, addressesData, mission.remote ?? null);

  return {
    log: { id, clientId, publisherId, title, statusCode: mission.statusCode ?? "ACCEPTED" },
    mission,
    update,
    addresses: addressesData,
    domains: domainsData,
    activities: activitiesData,
    moderationStatuses: moderationStatusesData,
    jobBoards,
  };
};

const prepareComparable = (entry: NormalizedMissionData): ComparableMission => ({
  mission: {
    id: entry.mission.id as string,
    clientId: entry.mission.clientId,
    publisherId: entry.mission.publisherId,
    title: entry.mission.title,
    statusCode: (entry.mission.statusCode ?? "ACCEPTED") as Prisma.MissionStatusCode,
    statusComment: entry.mission.statusComment ?? null,
    description: entry.mission.description ?? null,
    descriptionHtml: entry.mission.descriptionHtml ?? null,
    tags: entry.mission.tags ?? [],
    tasks: entry.mission.tasks ?? [],
    audience: entry.mission.audience ?? [],
    softSkills: entry.mission.softSkills ?? [],
    requirements: entry.mission.requirements ?? [],
    romeSkills: entry.mission.romeSkills ?? [],
    reducedMobilityAccessible: (entry.mission.reducedMobilityAccessible ?? null) as boolean | null,
    closeToTransport: (entry.mission.closeToTransport ?? null) as boolean | null,
    openToMinors: (entry.mission.openToMinors ?? null) as boolean | null,
    remote: (entry.mission.remote ?? null) as Prisma.MissionRemote | null,
    schedule: entry.mission.schedule ?? null,
    duration: (entry.mission.duration as number | undefined | null) ?? null,
    postedAt: (entry.mission.postedAt as Date | null | undefined) ?? null,
    startAt: (entry.mission.startAt as Date | null | undefined) ?? null,
    endAt: (entry.mission.endAt as Date | null | undefined) ?? null,
    priority: entry.mission.priority ?? null,
    places: (entry.mission.places as number | undefined | null) ?? null,
    placesStatus: (entry.mission.placesStatus ?? null) as Prisma.MissionPlacesStatus | null,
    metadata: entry.mission.metadata ?? null,
    domainOriginal: entry.mission.domainOriginal ?? null,
    domainLogo: entry.mission.domainLogo ?? null,
    type: (entry.mission.type ?? null) as Prisma.MissionType | null,
    snu: !!entry.mission.snu,
    snuPlaces: (entry.mission.snuPlaces as number | undefined | null) ?? null,
    compensationAmount: (entry.mission.compensationAmount as number | undefined | null) ?? null,
    compensationUnit: (entry.mission.compensationUnit ?? null) as Prisma.MissionCompensationUnit | null,
    compensationType: (entry.mission.compensationType ?? null) as Prisma.MissionCompensationType | null,
    organizationClientId: entry.mission.organizationClientId ?? null,
    organizationId: entry.mission.organizationId ?? null,
    lastSyncAt: (entry.mission.lastSyncAt as Date | undefined | null) ?? null,
    applicationUrl: entry.mission.applicationUrl ?? null,
    deletedAt: (entry.mission.deletedAt as Date | undefined | null) ?? null,
    lastExportedToPgAt: (entry.mission.lastExportedToPgAt as Date | undefined | null) ?? null,
  },
  addresses: entry.addresses.map((address) => ({
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    departmentName: address.departmentName ?? null,
    departmentCode: address.departmentCode ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    country: address.country ?? null,
    locationLat: address.locationLat ?? null,
    locationLon: address.locationLon ?? null,
    geolocStatus: address.geolocStatus ?? null,
  })),
  domains: entry.domains.map((domain) => ({
    value: domain.value,
    original: domain.original ?? null,
    logo: domain.logo ?? null,
  })),
  activities: entry.activities.map((activity) => ({ value: activity.value })),
  moderationStatuses: entry.moderationStatuses.map((status) => ({
    publisherId: status.publisherId,
    status: status.status ?? null,
    comment: status.comment ?? null,
    note: status.note ?? null,
    title: status.title ?? null,
    createdAt: status.createdAt ?? null,
  })),
  jobBoards: entry.jobBoards.map((jobBoard) => ({
    jobBoardId: jobBoard.jobBoardId,
    missionAddressId: jobBoard.missionAddressId ?? null,
    publicId: jobBoard.publicId,
    status: jobBoard.status ?? null,
    comment: jobBoard.comment ?? null,
    updatedAt: jobBoard.updatedAt ?? null,
  })),
});

const toComparableFromPrisma = (mission: any): ComparableMission => ({
  mission: {
    id: mission.id,
    clientId: mission.clientId,
    publisherId: mission.publisherId,
    title: mission.title,
    statusCode: mission.statusCode,
    statusComment: mission.statusComment ?? null,
    description: mission.description ?? null,
    descriptionHtml: mission.descriptionHtml ?? null,
    tags: mission.tags ?? [],
    tasks: mission.tasks ?? [],
    audience: mission.audience ?? [],
    softSkills: mission.softSkills ?? [],
    requirements: mission.requirements ?? [],
    romeSkills: mission.romeSkills ?? [],
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
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    type: mission.type ?? null,
    snu: mission.snu ?? false,
    snuPlaces: mission.snuPlaces ?? null,
    compensationAmount: mission.compensationAmount ?? null,
    compensationUnit: mission.compensationUnit ?? null,
    compensationType: mission.compensationType ?? null,
    organizationClientId: mission.organizationClientId ?? null,
    organizationId: mission.organizationId ?? null,
    lastSyncAt: mission.lastSyncAt ?? null,
    applicationUrl: mission.applicationUrl ?? null,
    deletedAt: mission.deletedAt ?? null,
    lastExportedToPgAt: mission.lastExportedToPgAt ?? null,
  },
  addresses: (mission.addresses ?? []).map((address: any) => ({
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    departmentName: address.departmentName ?? null,
    departmentCode: address.departmentCode ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    country: address.country ?? null,
    locationLat: address.locationLat ?? null,
    locationLon: address.locationLon ?? null,
    geolocStatus: address.geolocStatus ?? null,
  })),
  domains: (mission.domains ?? []).map((domain: any) => ({
    value: domain.value ?? "",
    original: domain.original ?? null,
    logo: domain.logo ?? null,
  })),
  activities: (mission.activities ?? []).map((activity: any) => ({
    value: activity.value ?? "",
  })),
  moderationStatuses: (mission.moderationStatuses ?? []).map((status: any) => ({
    publisherId: status.publisherId,
    status: status.status ?? null,
    comment: status.comment ?? null,
    note: status.note ?? null,
    title: status.title ?? null,
    createdAt: status.createdAt ?? null,
  })),
  jobBoards: (mission.jobBoards ?? []).map((jobBoard: any) => ({
    jobBoardId: jobBoard.jobBoardId,
    missionAddressId: jobBoard.missionAddressId ?? null,
    publicId: jobBoard.publicId,
    status: jobBoard.status ?? null,
    comment: jobBoard.comment ?? null,
    updatedAt: jobBoard.updatedAt ?? null,
  })),
});

const sortAddresses = (addresses: ComparableMission["addresses"]) =>
  [...addresses].sort((a, b) => {
    if (a.city !== b.city) return (a.city ?? "").localeCompare(b.city ?? "");
    return (a.street ?? "").localeCompare(b.street ?? "");
  });

const sortModerationStatuses = (statuses: ComparableMission["moderationStatuses"]) =>
  [...statuses].sort((a, b) => a.publisherId.localeCompare(b.publisherId));

const sortJobBoards = (jobBoards: ComparableMission["jobBoards"]) =>
  [...jobBoards].sort((a, b) => {
    if (a.jobBoardId !== b.jobBoardId) return a.jobBoardId.localeCompare(b.jobBoardId);
    if ((a.missionAddressId ?? "") !== (b.missionAddressId ?? "")) return (a.missionAddressId ?? "").localeCompare(b.missionAddressId ?? "");
    return a.publicId.localeCompare(b.publicId);
  });

const sortDomains = (domains: ComparableMission["domains"]) =>
  [...domains].sort((a, b) => a.value.localeCompare(b.value));

const sortActivities = (activities: ComparableMission["activities"]) =>
  [...activities].sort((a, b) => a.value.localeCompare(b.value));

const hasDifferences = (existing: ComparableMission, target: ComparableMission) => {
  if (!compareStrings(existing.mission.title, target.mission.title)) return true;
  if (!compareStrings(existing.mission.clientId, target.mission.clientId)) return true;
  if (!compareStrings(existing.mission.publisherId, target.mission.publisherId)) return true;
  if (!compareStrings(existing.mission.statusCode, target.mission.statusCode)) return true;
  if (!compareStrings(existing.mission.statusComment, target.mission.statusComment)) return true;
  if (!compareStrings(existing.mission.description, target.mission.description)) return true;
  if (!compareStrings(existing.mission.descriptionHtml, target.mission.descriptionHtml)) return true;
  if (!compareStringArrays(existing.mission.tags, target.mission.tags)) return true;
  if (!compareStringArrays(existing.mission.tasks, target.mission.tasks)) return true;
  if (!compareStringArrays(existing.mission.audience, target.mission.audience)) return true;
  if (!compareStringArrays(existing.mission.softSkills, target.mission.softSkills)) return true;
  if (!compareStringArrays(existing.mission.requirements, target.mission.requirements)) return true;
  if (!compareStringArrays(existing.mission.romeSkills, target.mission.romeSkills)) return true;
  if (!compareBooleans(existing.mission.reducedMobilityAccessible ?? false, target.mission.reducedMobilityAccessible ?? false)) return true;
  if (!compareBooleans(existing.mission.closeToTransport ?? false, target.mission.closeToTransport ?? false)) return true;
  if (!compareBooleans(existing.mission.openToMinors ?? false, target.mission.openToMinors ?? false)) return true;
  if (!compareStrings(existing.mission.remote, target.mission.remote)) return true;
  if (!compareStrings(existing.mission.schedule, target.mission.schedule)) return true;
  if (!compareNumbers(existing.mission.duration, target.mission.duration)) return true;
  if (!compareDates(existing.mission.postedAt, target.mission.postedAt)) return true;
  if (!compareDates(existing.mission.startAt, target.mission.startAt)) return true;
  if (!compareDates(existing.mission.endAt, target.mission.endAt)) return true;
  if (!compareStrings(existing.mission.priority, target.mission.priority)) return true;
  if (!compareNumbers(existing.mission.places, target.mission.places)) return true;
  if (!compareStrings(existing.mission.placesStatus, target.mission.placesStatus)) return true;
  if (!compareStrings(existing.mission.metadata, target.mission.metadata)) return true;
  if (!compareStrings(existing.mission.domainOriginal, target.mission.domainOriginal)) return true;
  if (!compareStrings(existing.mission.domainLogo, target.mission.domainLogo)) return true;
  if (!compareStrings(existing.mission.type, target.mission.type)) return true;
  if (!compareBooleans(existing.mission.snu, target.mission.snu)) return true;
  if (!compareNumbers(existing.mission.snuPlaces, target.mission.snuPlaces)) return true;
  if (!compareNumbers(existing.mission.compensationAmount, target.mission.compensationAmount)) return true;
  if (!compareStrings(existing.mission.compensationUnit, target.mission.compensationUnit)) return true;
  if (!compareStrings(existing.mission.compensationType, target.mission.compensationType)) return true;
  if (!compareStrings(existing.mission.organizationClientId, target.mission.organizationClientId)) return true;
  if (!compareStrings(existing.mission.organizationId, target.mission.organizationId)) return true;
  if (!compareDates(existing.mission.lastSyncAt, target.mission.lastSyncAt)) return true;
  if (!compareStrings(existing.mission.applicationUrl, target.mission.applicationUrl)) return true;
  if (!compareDates(existing.mission.deletedAt, target.mission.deletedAt)) return true;
  if (!compareDates(existing.mission.lastExportedToPgAt, target.mission.lastExportedToPgAt)) return true;

  const sameAddresses = compareJsons(sortAddresses(existing.addresses), sortAddresses(target.addresses));
  const sameModerations = compareJsons(sortModerationStatuses(existing.moderationStatuses), sortModerationStatuses(target.moderationStatuses));
  const sameJobBoards = compareJsons(sortJobBoards(existing.jobBoards), sortJobBoards(target.jobBoards));
  const sameDomains = compareJsons(sortDomains(existing.domains), sortDomains(target.domains));
  const sameActivities = compareJsons(sortActivities(existing.activities), sortActivities(target.activities));

  return !(sameAddresses && sameModerations && sameJobBoards && sameDomains && sameActivities);
};

const formatForLog = (entry: NormalizedMissionData["log"]) => ({
  id: entry.id,
  clientId: entry.clientId,
  publisherId: entry.publisherId,
  title: entry.title,
  statusCode: entry.statusCode,
});

const persistBatch = async (
  batch: NormalizedMissionData[],
  prismaCore: PrismaClient,
  stats: { created: number; updated: number; unchanged: number },
  sampleCreates: NormalizedMissionData["log"][],
  sampleUpdates: { before: ComparableMission; after: ComparableMission }[],
  dryRun: boolean
) => {
  if (!batch.length) return;

  const organizationIds = Array.from(new Set(batch.map(({ mission }) => mission.organizationId).filter((id): id is string => typeof id === "string" && id.length > 0)));
  const existingOrganizations = organizationIds.length ? await prismaCore.organization.findMany({ where: { id: { in: organizationIds } }, select: { id: true } }) : [];
  const validOrganizationIds = new Set(existingOrganizations.map((org) => org.id));

  const normalizeOrganizationId = <T extends { organizationId?: any }>(input: T): T => {
    const copy = { ...input };
    if (typeof copy.organizationId === "string" && !validOrganizationIds.has(copy.organizationId)) {
      copy.organizationId = null;
    } else if (copy.organizationId && typeof copy.organizationId.set === "string" && !validOrganizationIds.has(copy.organizationId.set)) {
      copy.organizationId = { set: null };
    }
    return copy;
  };

  const ids = batch.map(({ mission }) => mission.id as string);
  const existingRecords = await prismaCore.mission.findMany({
    where: { id: { in: ids } },
    include: { addresses: true, moderationStatuses: true, jobBoards: true, domains: true, activities: true },
  });
  const existingById = new Map(existingRecords.map((mission) => [mission.id, mission]));

  for (const entry of batch) {
    const existing = existingById.get(entry.mission.id as string);

    if (!existing) {
      stats.created += 1;
      if (dryRun) {
        if (sampleCreates.length < 5) {
          sampleCreates.push(entry.log);
        }
      } else {
        const data = normalizeOrganizationId(entry.mission);
        await prismaCore.mission.create({ data });
        if (entry.addresses.length) {
          await prismaCore.missionAddress.createMany({ data: entry.addresses });
        }
        if (entry.domains.length) {
          await prismaCore.missionDomain.createMany({ data: entry.domains });
        }
        if (entry.activities.length) {
          await prismaCore.missionActivity.createMany({ data: entry.activities });
        }
        if (entry.moderationStatuses.length) {
          await prismaCore.missionModerationStatus.createMany({ data: entry.moderationStatuses });
        }
        if (entry.jobBoards.length) {
          await prismaCore.missionJobBoard.createMany({ data: entry.jobBoards });
        }
      }
      continue;
    }

    const beforeComparable = toComparableFromPrisma(existing);
    const afterComparable = prepareComparable(entry);
    const differs = hasDifferences(beforeComparable, afterComparable);

    if (!differs) {
      stats.unchanged += 1;
      continue;
    }

    stats.updated += 1;
    if (dryRun) {
      if (sampleUpdates.length < 5) {
        sampleUpdates.push({ before: beforeComparable, after: afterComparable });
      }
    } else {
      const updateData = normalizeOrganizationId(entry.update);
      await prismaCore.mission.update({ where: { id: entry.mission.id as string }, data: updateData });
      await prismaCore.missionAddress.deleteMany({ where: { missionId: entry.mission.id as string } });
      if (entry.addresses.length) {
        await prismaCore.missionAddress.createMany({ data: entry.addresses });
      }
      await prismaCore.missionDomain.deleteMany({ where: { missionId: entry.mission.id as string } });
      if (entry.domains.length) {
        await prismaCore.missionDomain.createMany({ data: entry.domains });
      }
      await prismaCore.missionActivity.deleteMany({ where: { missionId: entry.mission.id as string } });
      if (entry.activities.length) {
        await prismaCore.missionActivity.createMany({ data: entry.activities });
      }
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: entry.mission.id as string } });
      if (entry.moderationStatuses.length) {
        await prismaCore.missionModerationStatus.createMany({ data: entry.moderationStatuses });
      }
      await prismaCore.missionJobBoard.deleteMany({ where: { missionId: entry.mission.id as string, jobBoardId: { in: jobBoardIds } } });
      if (entry.jobBoards.length) {
        await prismaCore.missionJobBoard.createMany({ data: entry.jobBoards });
      }
    }
  }
};

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[${SCRIPT_NAME}] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("missions");
  const total = await collection.countDocuments();
  console.log(`[${SCRIPT_NAME}] Found ${total} mission(s) in MongoDB`);

  if (total === 0) {
    console.log(`[${SCRIPT_NAME}] Nothing to migrate`);
    return;
  }

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  const stats = { processed: 0, created: 0, updated: 0, unchanged: 0, skipped: 0 };
  const sampleCreates: NormalizedMissionData["log"][] = [];
  const sampleUpdates: { before: ComparableMission; after: ComparableMission }[] = [];

  let batch: NormalizedMissionData[] = [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoMissionDocument;
    try {
      const normalized = normalizeMission(doc);
      batch.push(normalized);
      stats.processed += 1;
    } catch (error) {
      stats.skipped += 1;
      console.warn(`[${SCRIPT_NAME}] Skip mission due to normalization error: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (batch.length >= BATCH_SIZE) {
      await persistBatch(batch, prismaCore, stats, sampleCreates, sampleUpdates, options.dryRun);
      console.log(`[${SCRIPT_NAME}] Processed ${stats.processed}/${total}`);
      batch = [];
    }
  }

  if (batch.length) {
    await persistBatch(batch, prismaCore, stats, sampleCreates, sampleUpdates, options.dryRun);
  }

  console.log(`[${SCRIPT_NAME}] Completed. Created: ${stats.created}, Updated: ${stats.updated}, Unchanged: ${stats.unchanged}`);
  if (stats.skipped) {
    console.log(`[${SCRIPT_NAME}] Skipped (invalid/missing required fields): ${stats.skipped}`);
  }

  if (options.dryRun) {
    console.log(`[${SCRIPT_NAME}] Sample creates`, sampleCreates.slice(0, 3).map(formatForLog));
    console.log(`[${SCRIPT_NAME}] Sample updates`, sampleUpdates.slice(0, 3).map(({ before, after }) => ({ before: before.mission, after: after.mission })));
  }
};

main()
  .catch((error) => {
    console.error(`[${SCRIPT_NAME}] Error`, error);
    process.exit(1);
  })
  .finally(cleanup);
