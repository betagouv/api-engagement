import { randomUUID } from "crypto";
import mongoose from "mongoose";

import type { JobBoardId, Prisma, PrismaClient } from "../../src/db/core";
import type { MissionRecord } from "../../src/types/mission";
import { asString, toMongoObjectIdString } from "./utils/cast";
import { compareDates, compareJsons, compareNumbers, compareStringArrays, compareStrings } from "./utils/compare";
import { normalizeDate, normalizeNumber } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const SCRIPT_NAME = "MigrateMissions";
const BATCH_SIZE = 100;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), SCRIPT_NAME);
loadEnvironment(options, __dirname, SCRIPT_NAME);
const LETUDIANT_JOB_BOARD_ID: JobBoardId = "LETUDIANT";

const missionRemoteValues: Prisma.MissionRemote[] = ["no", "possible", "full"];
const missionYesNoValues: Prisma.MissionYesNo[] = ["yes", "no"];
const missionPlacesStatusValues: Prisma.MissionPlacesStatus[] = ["ATTRIBUTED_BY_API", "GIVEN_BY_PARTNER"];
const missionTypeValues: Prisma.MissionType[] = ["benevolat", "volontariat_service_civique"];
const compensationUnitValues: Prisma.CompensationUnit[] = ["hour", "day", "month", "year"];
const compensationTypeValues: Prisma.CompensationType[] = ["gross", "net"];

type MongoMissionDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  _old_id?: string;
  _old_ids?: string[];
  clientId?: string;
  publisherId?: string;
  organizationId?: string | null;
  organizationClientId?: string | null;
  title?: string;
  description?: string | null;
  descriptionHtml?: string | null;
  tags?: string[];
  tasks?: string[];
  audience?: string[];
  softSkills?: string[];
  soft_skills?: string[];
  requirements?: string[];
  romeSkills?: string[];
  reducedMobilityAccessible?: string | null;
  closeToTransport?: string | null;
  openToMinors?: string | null;
  remote?: string | null;
  schedule?: string | null;
  duration?: number | null;
  postedAt?: Date | string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  priority?: string | null;
  places?: number | null;
  placesStatus?: string | null;
  metadata?: string | null;
  domain?: string | null;
  domainOriginal?: string | null;
  domainLogo?: string | null;
  activity?: string | null;
  type?: string | null;
  snu?: boolean;
  snuPlaces?: number | null;
  compensationAmount?: number | null;
  compensationUnit?: string | null;
  compensationType?: string | null;
  adresse?: string | null;
  address?: string | null;
  postalCode?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  location?: { lat?: number; lon?: number } | null;
  addresses?: any[];
  lastSyncAt?: Date | string | null;
  applicationUrl?: string | null;
  statusCode?: string | null;
  statusComment?: string | null;
  deletedAt?: Date | string | null;
  leboncoinStatus?: string | null;
  leboncoinUrl?: string | null;
  leboncoinComment?: string | null;
  leboncoinUpdatedAt?: Date | string | null;
  letudiantPublicId?: any;
  letudiantUpdatedAt?: Date | string | null;
  letudiantError?: string | null;
  lastExportedToPgAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  [key: `moderation_${string}_status`]: string | undefined;
};

type NormalizedMissionData = {
  record: MissionRecord;
  missionData: Prisma.MissionUncheckedCreateInput;
  updateData: Prisma.MissionUncheckedUpdateInput;
  addresses: Prisma.MissionAddressCreateManyInput[];
  moderationStatuses: Prisma.MissionModerationStatusCreateManyInput[];
  jobBoards: Prisma.MissionJobBoardCreateManyInput[];
};

const normalizeStatus = (status?: string | null): MissionRecord["statusCode"] => {
  if (!status) return "ACCEPTED";
  return status === "REFUSED" ? "REFUSED" : "ACCEPTED";
};

const normalizeEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return undefined;
};

const uniqueStringArray = (value?: unknown): string[] => {
  const set = new Set<string>();
  if (typeof value === "string" && value.trim()) {
    set.add(value.trim());
  }
  const values = Array.isArray(value) ? value : [];
  for (const entry of values) {
    if (typeof entry === "string" && entry.trim()) {
      set.add(entry.trim());
    }
  }
  return Array.from(set);
};

const normalizeAddresses = (
  doc: MongoMissionDocument
): Array<{
  street?: string | null;
  postalCode?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  location?: { lat?: number; lon?: number } | null;
  geolocStatus?: string | null;
}> => {
  const normalized = Array.isArray(doc.addresses)
    ? doc.addresses.map((address) => ({
        street: address?.street ?? null,
        postalCode: address?.postalCode ?? null,
        departmentName: address?.departmentName ?? null,
        departmentCode: address?.departmentCode ?? null,
        city: address?.city ?? null,
        region: address?.region ?? null,
        country: address?.country ?? null,
        location: address?.location ?? null,
        geolocStatus: address?.geolocStatus ?? null,
      }))
    : [];

  if (!normalized.length && (doc.address || doc.postalCode || doc.city || doc.country)) {
    normalized.push({
      street: doc.address ?? doc.adresse ?? null,
      postalCode: doc.postalCode ?? null,
      departmentName: doc.departmentName ?? null,
      departmentCode: doc.departmentCode ?? null,
      city: doc.city ?? null,
      region: doc.region ?? null,
      country: doc.country ?? null,
      location: doc.location ?? null,
      geolocStatus: null,
    });
  }

  return normalized;
};

const formatLocalisation = (parts: Array<string | null | undefined>) => parts.filter((p) => Boolean(p && String(p).trim().length)).join(", ") || "France";

const computeLetudiantLocalisations = (mission: MissionRecord): Array<{ missionAddressId: string | null; localisationKey: string }> => {
  if (mission.remote === "full" || !mission.addresses.length) {
    const city = mission.organizationCity || undefined;
    const department = mission.organizationDepartment || undefined;
    const country = mission.country || "France";
    const formatted = formatLocalisation([city, department, country]);
    return [{ missionAddressId: null, localisationKey: mission.remote === "full" ? "A distance" : formatted }];
  }

  const seenCities = new Set<string>();
  const entries: Array<{ missionAddressId: string | null; localisationKey: string }> = [];

  for (const address of mission.addresses) {
    const city = address.city || "";
    if (seenCities.has(city)) {
      continue;
    }
    seenCities.add(city);
    const localisation = formatLocalisation([address.city, address.departmentName, address.country || "France"]);
    entries.push({ missionAddressId: (address as any).id ?? null, localisationKey: localisation });
  }

  return entries;
};

const extractModerationStatuses = (
  doc: MongoMissionDocument
): Array<{
  publisherId: string;
  status: string | null;
  comment: string | null;
  note: string | null;
  title: string | null;
  createdAt: Date | null;
}> => {
  const entries: Array<{
    publisherId: string;
    status: string | null;
    comment: string | null;
    note: string | null;
    title: string | null;
    createdAt: Date | null;
  }> = [];
  Object.keys(doc || {}).forEach((key) => {
    const match = key.match(/^moderation_(.+)_status$/);
    if (match) {
      const moderatorId = match[1];
      const value = asString((doc as any)[key]);
      const comment = asString((doc as any)[`moderation_${moderatorId}_comment`]) ?? null;
      const note = asString((doc as any)[`moderation_${moderatorId}_note`]) ?? null;
      const title = asString((doc as any)[`moderation_${moderatorId}_title`]) ?? null;
      const dateValue = normalizeDate((doc as any)[`moderation_${moderatorId}_date`]) ?? null;
      entries.push({
        publisherId: moderatorId,
        status: value ?? null,
        comment,
        note,
        title,
        createdAt: dateValue,
      });
    }
  });
  return entries;
};

const toNormalizedMission = (doc: MongoMissionDocument): NormalizedMissionData => {
  const id = toMongoObjectIdString(doc._id) ?? asString(doc.id);
  if (!id) {
    throw new Error("[MigrateMissions] Encountered mission without identifier");
  }

  const clientId = asString(doc.clientId);
  const publisherId = asString(doc.publisherId);
  const title = asString(doc.title);

  if (!clientId || !publisherId || !title) {
    throw new Error(`[${SCRIPT_NAME}] Mission ${id} is missing required fields (clientId, publisherId or title)`);
  }

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;
  const addresses = normalizeAddresses(doc).map((address) => ({ ...address, id: randomUUID() }));
  const firstAddress = addresses[0] ?? {};
  const location = doc.location ?? firstAddress.location ?? null;
  const moderationStatuses = extractModerationStatuses(doc);
  const letudiantPublicId = typeof doc.letudiantPublicId === "object" && doc.letudiantPublicId !== null ? (doc.letudiantPublicId as Record<string, unknown>) : null;

  const record: MissionRecord = {
    _id: id,
    id,
    clientId,
    publisherId,
    publisherName: null,
    publisherUrl: null,
    publisherLogo: null,
    title,
    description: doc.description ?? null,
    descriptionHtml: doc.descriptionHtml ?? null,
    tags: uniqueStringArray(doc.tags),
    tasks: uniqueStringArray(doc.tasks),
    audience: uniqueStringArray(doc.audience),
    softSkills: uniqueStringArray(doc.softSkills ?? doc.soft_skills),
    soft_skills: uniqueStringArray(doc.softSkills ?? doc.soft_skills),
    requirements: uniqueStringArray(doc.requirements),
    romeSkills: uniqueStringArray(doc.romeSkills),
    reducedMobilityAccessible: normalizeEnum(doc.reducedMobilityAccessible, missionYesNoValues) ?? null,
    closeToTransport: normalizeEnum(doc.closeToTransport, missionYesNoValues) ?? null,
    openToMinors: normalizeEnum(doc.openToMinors, missionYesNoValues) ?? null,
    remote: normalizeEnum(doc.remote, missionRemoteValues) ?? null,
    schedule: doc.schedule ?? null,
    duration: normalizeNumber(doc.duration),
    postedAt: normalizeDate(doc.postedAt),
    startAt: normalizeDate(doc.startAt),
    endAt: normalizeDate(doc.endAt),
    priority: doc.priority ?? null,
    places: normalizeNumber(doc.places),
    placesStatus: normalizeEnum(doc.placesStatus, missionPlacesStatusValues) ?? null,
    metadata: doc.metadata ?? null,
    domain: doc.domain ?? null,
    domainOriginal: doc.domainOriginal ?? null,
    domainLogo: doc.domainLogo ?? null,
    activity: doc.activity ?? null,
    type: normalizeEnum(doc.type, missionTypeValues) ?? null,
    snu: !!doc.snu,
    snuPlaces: normalizeNumber(doc.snuPlaces),
    compensationAmount: normalizeNumber(doc.compensationAmount),
    compensationUnit: normalizeEnum(doc.compensationUnit, compensationUnitValues) ?? null,
    compensationType: normalizeEnum(doc.compensationType, compensationTypeValues) ?? null,
    adresse: firstAddress.street ?? null,
    address: firstAddress.street ?? null,
    postalCode: firstAddress.postalCode ?? null,
    departmentName: firstAddress.departmentName ?? null,
    departmentCode: firstAddress.departmentCode ?? null,
    city: firstAddress.city ?? null,
    region: firstAddress.region ?? null,
    country: firstAddress.country ?? null,
    location: location ?? null,
    addresses: addresses.map((addr) => ({
      id: (addr as any).id ?? undefined,
      street: addr.street ?? null,
      postalCode: addr.postalCode ?? null,
      departmentName: addr.departmentName ?? null,
      departmentCode: addr.departmentCode ?? null,
      city: addr.city ?? null,
      region: addr.region ?? null,
      country: addr.country ?? null,
      location: addr.location && typeof addr.location.lat === "number" && typeof addr.location.lon === "number" ? { lat: addr.location.lat, lon: addr.location.lon } : null,
      geoPoint: null,
      geolocStatus: addr.geolocStatus ?? null,
    })),
    organizationId: doc.organizationId ?? null,
    organizationClientId: doc.organizationClientId ?? null,
    organizationUrl: null,
    organizationName: null,
    organizationType: null,
    organizationLogo: null,
    organizationDescription: null,
    organizationFullAddress: null,
    organizationRNA: null,
    organizationSiren: null,
    organizationSiret: null,
    organizationDepartment: null,
    organizationDepartmentCode: null,
    organizationDepartmentName: null,
    organizationPostCode: null,
    organizationCity: null,
    organizationStatusJuridique: null,
    organizationBeneficiaries: [],
    organizationActions: [],
    organizationReseaux: [],
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
    lastSyncAt: normalizeDate(doc.lastSyncAt),
    applicationUrl: doc.applicationUrl ?? null,
    statusCode: normalizeStatus(doc.statusCode),
    statusComment: doc.statusComment ?? null,
    deletedAt: normalizeDate(doc.deletedAt),
    leboncoinStatus: doc.leboncoinStatus ?? null,
    leboncoinUrl: doc.leboncoinUrl ?? null,
    leboncoinComment: doc.leboncoinComment ?? null,
    leboncoinUpdatedAt: normalizeDate(doc.leboncoinUpdatedAt),
    letudiantUpdatedAt: normalizeDate(doc.letudiantUpdatedAt),
    letudiantError: doc.letudiantError ?? null,
    lastExportedToPgAt: normalizeDate(doc.lastExportedToPgAt),
    createdAt,
    updatedAt,
  };

  const missionData: Prisma.MissionUncheckedCreateInput = {
    id: record.id,
    oldId: doc._old_id ?? undefined,
    oldIds: doc._old_ids ?? [],
    clientId: record.clientId,
    publisherId: record.publisherId,
    title: record.title,
    statusCode: record.statusCode,
    description: record.description ?? undefined,
    descriptionHtml: record.descriptionHtml ?? undefined,
    tags: record.tags,
    tasks: record.tasks,
    audience: record.audience,
    softSkills: record.softSkills,
    requirements: record.requirements,
    romeSkills: record.romeSkills,
    reducedMobilityAccessible: normalizeEnum(record.reducedMobilityAccessible, missionYesNoValues),
    closeToTransport: normalizeEnum(record.closeToTransport, missionYesNoValues),
    openToMinors: normalizeEnum(record.openToMinors, missionYesNoValues),
    remote: normalizeEnum(record.remote, missionRemoteValues),
    schedule: record.schedule ?? undefined,
    duration: record.duration ?? undefined,
    postedAt: record.postedAt ?? undefined,
    startAt: record.startAt ?? undefined,
    endAt: record.endAt ?? undefined,
    priority: record.priority ?? undefined,
    places: record.places ?? undefined,
    placesStatus: normalizeEnum(record.placesStatus, missionPlacesStatusValues),
    metadata: record.metadata ?? undefined,
    domain: record.domain ?? undefined,
    domainOriginal: record.domainOriginal ?? undefined,
    domainLogo: record.domainLogo ?? undefined,
    activity: record.activity ?? undefined,
    type: normalizeEnum(record.type, missionTypeValues),
    snu: record.snu,
    snuPlaces: record.snuPlaces ?? undefined,
    compensationAmount: record.compensationAmount ?? undefined,
    compensationUnit: normalizeEnum(record.compensationUnit, compensationUnitValues),
    compensationType: normalizeEnum(record.compensationType, compensationTypeValues),
    organizationClientId: record.organizationClientId ?? undefined,
    organizationId: record.organizationId ?? undefined,
    lastSyncAt: record.lastSyncAt ?? undefined,
    applicationUrl: record.applicationUrl ?? undefined,
    statusComment: record.statusComment ?? undefined,
    deletedAt: record.deletedAt ?? undefined,
    leboncoinStatus: record.leboncoinStatus ?? undefined,
    leboncoinUrl: record.leboncoinUrl ?? undefined,
    leboncoinComment: record.leboncoinComment ?? undefined,
    leboncoinUpdatedAt: record.leboncoinUpdatedAt ?? undefined,
    letudiantUpdatedAt: record.letudiantUpdatedAt ?? undefined,
    letudiantError: record.letudiantError ?? undefined,
    lastExportedToPgAt: record.lastExportedToPgAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? undefined,
  };

  const updateData: Prisma.MissionUncheckedUpdateInput = {
    ...missionData,
    id: undefined,
    createdAt: undefined,
  };

  const addressesData: Prisma.MissionAddressCreateManyInput[] = addresses.map((address) => ({
    id: (address as any).id ?? undefined,
    missionId: id,
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    departmentName: address.departmentName ?? null,
    departmentCode: address.departmentCode ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    country: address.country ?? null,
    locationLat: typeof address.location?.lat === "number" ? address.location.lat : null,
    locationLon: typeof address.location?.lon === "number" ? address.location.lon : null,
    geolocStatus: address.geolocStatus ?? null,
  }));

  const moderationStatusesData: Prisma.MissionModerationStatusCreateManyInput[] = moderationStatuses.map((item) => ({
    missionId: id,
    publisherId: item.publisherId,
    status: item.status ?? null,
    comment: item.comment ?? null,
    note: item.note ?? null,
    title: item.title ?? null,
    createdAt: item.createdAt ?? record.createdAt,
  }));

  const jobBoardsData: Prisma.MissionJobBoardCreateManyInput[] = [];
  if (letudiantPublicId) {
    const localisations = computeLetudiantLocalisations(record);
    for (const entry of localisations) {
      const legacyKey = entry.localisationKey.split(",")[0];
      const publicId = letudiantPublicId[entry.localisationKey] ?? letudiantPublicId[legacyKey];
      if (typeof publicId === "string" && publicId.trim()) {
        jobBoardsData.push({
          id: randomUUID(),
          jobBoardId: LETUDIANT_JOB_BOARD_ID,
          missionId: id,
          missionAddressId: entry.missionAddressId ?? null,
          publicId,
          status: null,
          comment: null,
        });
      }
    }
  }

  if (record.leboncoinStatus || record.leboncoinUrl || record.leboncoinComment) {
    jobBoardsData.push({
      id: randomUUID(),
      jobBoardId: "LEBONCOIN",
      missionId: id,
      missionAddressId: null,
      publicId: record.leboncoinUrl || id,
      status: record.leboncoinStatus || null,
      comment: record.leboncoinComment || null,
    });
  }

  return { record, missionData, updateData, addresses: addressesData, moderationStatuses: moderationStatusesData, jobBoards: jobBoardsData };
};

const hasDifferences = (existing: MissionRecord, target: MissionRecord) => {
  const normalizeAddressesForCompare = (addresses?: MissionRecord["addresses"]) => (addresses ?? []).map(({ id: _ignored, ...rest }) => rest);
  if (!compareStrings(existing.title, target.title)) return true;
  if (!compareStrings(existing.clientId, target.clientId)) return true;
  if (!compareStrings(existing.publisherId, target.publisherId)) return true;
  if (!compareStrings(existing.statusCode, target.statusCode)) return true;
  if (!compareStrings(existing.statusComment, target.statusComment)) return true;
  if (!compareStrings(existing.description, target.description)) return true;
  if (!compareStrings(existing.descriptionHtml, target.descriptionHtml)) return true;
  if (!compareStringArrays(existing.tags, target.tags)) return true;
  if (!compareStringArrays(existing.tasks, target.tasks)) return true;
  if (!compareStringArrays(existing.audience, target.audience)) return true;
  if (!compareStringArrays(existing.softSkills, target.softSkills)) return true;
  if (!compareStringArrays(existing.requirements, target.requirements)) return true;
  if (!compareStringArrays(existing.romeSkills, target.romeSkills)) return true;
  if (!compareStrings(existing.domain, target.domain)) return true;
  if (!compareStrings(existing.activity, target.activity)) return true;
  if (!compareStrings(existing.type, target.type)) return true;
  if (!compareStrings(existing.remote, target.remote)) return true;
  if (!compareNumbers(existing.places, target.places)) return true;
  if (!compareNumbers(existing.compensationAmount, target.compensationAmount)) return true;
  if (!compareStrings(existing.compensationUnit, target.compensationUnit)) return true;
  if (!compareStrings(existing.compensationType, target.compensationType)) return true;
  if (!compareStrings(existing.city, target.city)) return true;
  if (!compareStrings(existing.departmentName, target.departmentName)) return true;
  if (!compareStrings(existing.departmentCode, target.departmentCode)) return true;
  if (!compareStrings(existing.country, target.country)) return true;
  if (!compareStrings(existing.organizationClientId, target.organizationClientId)) return true;
  if (!compareJsons(normalizeAddressesForCompare(existing.addresses), normalizeAddressesForCompare(target.addresses))) return true;
  if (!compareDates(existing.startAt, target.startAt)) return true;
  if (!compareDates(existing.endAt, target.endAt)) return true;
  if (!compareDates(existing.postedAt, target.postedAt)) return true;
  if (!compareDates(existing.deletedAt, target.deletedAt)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  return false;
};

const formatRecordForLog = (record: MissionRecord) => ({
  id: record.id,
  clientId: record.clientId,
  publisherId: record.publisherId,
  title: record.title,
  statusCode: record.statusCode,
});

const toRecordFromPrisma = (mission: any): MissionRecord => {
  const addresses = Array.isArray(mission.addresses)
    ? mission.addresses.map((address: any) => ({
        id: address.id ?? undefined,
        street: address.street ?? null,
        postalCode: address.postalCode ?? null,
        departmentName: address.departmentName ?? null,
        departmentCode: address.departmentCode ?? null,
        city: address.city ?? null,
        region: address.region ?? null,
        country: address.country ?? null,
        location: address.locationLat != null && address.locationLon != null ? { lat: address.locationLat, lon: address.locationLon } : null,
        geoPoint: null,
        geolocStatus: address.geolocStatus ?? null,
      }))
    : [];
  const first = addresses[0] ?? {};
  const location = first.location ?? null;

  return {
    _id: mission.id,
    id: mission.id,
    clientId: mission.clientId,
    publisherId: mission.publisherId,
    publisherName: null,
    publisherUrl: null,
    publisherLogo: null,
    title: mission.title,
    description: mission.description ?? null,
    descriptionHtml: mission.descriptionHtml ?? null,
    tags: mission.tags ?? [],
    tasks: mission.tasks ?? [],
    audience: mission.audience ?? [],
    softSkills: mission.softSkills ?? [],
    soft_skills: mission.softSkills ?? [],
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
    domain: mission.domain ?? null,
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    activity: mission.activity ?? null,
    type: mission.type ?? null,
    snu: mission.snu ?? false,
    snuPlaces: mission.snuPlaces ?? null,
    compensationAmount: mission.compensationAmount ?? null,
    compensationUnit: mission.compensationUnit ?? null,
    compensationType: mission.compensationType ?? null,
    adresse: first.street ?? null,
    address: first.street ?? null,
    postalCode: first.postalCode ?? null,
    departmentName: first.departmentName ?? null,
    departmentCode: first.departmentCode ?? null,
    city: first.city ?? null,
    region: first.region ?? null,
    country: first.country ?? null,
    location,
    addresses,
    organizationId: mission.organizationId ?? null,
    organizationClientId: mission.organizationClientId ?? null,
    organizationUrl: null,
    organizationName: null,
    organizationType: null,
    organizationLogo: null,
    organizationDescription: null,
    organizationFullAddress: null,
    organizationRNA: null,
    organizationSiren: null,
    organizationSiret: null,
    organizationDepartment: null,
    organizationDepartmentCode: null,
    organizationDepartmentName: null,
    organizationPostCode: null,
    organizationCity: null,
    organizationStatusJuridique: null,
    organizationBeneficiaries: [],
    organizationActions: [],
    organizationReseaux: [],
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
    statusCode: mission.statusCode ?? "ACCEPTED",
    statusComment: mission.statusComment ?? null,
    deletedAt: mission.deletedAt ?? null,
    leboncoinStatus: mission.leboncoinStatus ?? null,
    leboncoinUrl: mission.leboncoinUrl ?? null,
    leboncoinComment: mission.leboncoinComment ?? null,
    leboncoinUpdatedAt: mission.leboncoinUpdatedAt ?? null,
    letudiantUpdatedAt: mission.letudiantUpdatedAt ?? null,
    letudiantError: mission.letudiantError ?? null,
    lastExportedToPgAt: mission.lastExportedToPgAt ?? null,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    distanceKm: undefined,
  };
};

const persistBatch = async (
  batch: NormalizedMissionData[],
  prismaCore: PrismaClient,
  stats: { created: number; updated: number; unchanged: number },
  sampleCreates: MissionRecord[],
  sampleUpdates: { before: MissionRecord; after: MissionRecord }[],
  dryRun: boolean
) => {
  if (!batch.length) return;

  const organizationIds = Array.from(new Set(batch.map(({ missionData }) => missionData.organizationId).filter((id): id is string => typeof id === "string" && id.length > 0)));
  const existingOrganizations = organizationIds.length ? await prismaCore.organization.findMany({ where: { id: { in: organizationIds } }, select: { id: true } }) : [];
  const existingOrgSet = new Set(existingOrganizations.map((org) => org.id));

  const ids = batch.map(({ record }) => record.id);
  const existingRecords = await prismaCore.mission.findMany({ where: { id: { in: ids } }, include: { addresses: true } });
  const existingById = new Map(existingRecords.map((record) => [record.id, record]));

  const normalizeOrganizationId = <T extends { organizationId?: any }>(input: T): T => {
    const copy = { ...input };
    if (typeof copy.organizationId === "string") {
      copy.organizationId = existingOrgSet.has(copy.organizationId) ? copy.organizationId : null;
    } else if (copy.organizationId && typeof copy.organizationId.set === "string") {
      copy.organizationId = existingOrgSet.has(copy.organizationId.set) ? copy.organizationId : { set: null };
    }
    return copy;
  };

  for (const entry of batch) {
    const existing = existingById.get(entry.record.id);

    if (!existing) {
      stats.created += 1;
      if (dryRun) {
        if (sampleCreates.length < 5) {
          sampleCreates.push(entry.record);
        }
      } else {
        const missionData = normalizeOrganizationId(entry.missionData);
        await prismaCore.mission.create({ data: missionData });
        if (entry.addresses.length) {
          await prismaCore.missionAddress.createMany({ data: entry.addresses });
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

    const existingRecord = toRecordFromPrisma(existing);
    const hasChanges = hasDifferences(existingRecord, entry.record);
    const needsJobBoardRefresh = entry.jobBoards.length > 0;

    if (!hasChanges && !needsJobBoardRefresh) {
      stats.unchanged += 1;
      continue;
    }

    stats.updated += 1;
    if (dryRun) {
      if (sampleUpdates.length < 5) {
        sampleUpdates.push({ before: existingRecord, after: entry.record });
      }
    } else {
      const updateData = normalizeOrganizationId(entry.updateData);
      await prismaCore.mission.update({ where: { id: entry.record.id }, data: updateData });
      await prismaCore.missionAddress.deleteMany({ where: { missionId: entry.record.id } });
      if (entry.addresses.length) {
        await prismaCore.missionAddress.createMany({ data: entry.addresses });
      }
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: entry.record.id } });
      if (entry.moderationStatuses.length) {
        await prismaCore.missionModerationStatus.createMany({ data: entry.moderationStatuses });
      }
      await prismaCore.missionJobBoard.deleteMany({ where: { missionId: entry.record.id } });
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
  const sampleCreates: MissionRecord[] = [];
  const sampleUpdates: { before: MissionRecord; after: MissionRecord }[] = [];

  let batch: NormalizedMissionData[] = [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoMissionDocument;
    try {
      const normalized = toNormalizedMission(doc);
      batch.push(normalized);
      stats.processed += 1;
    } catch (error) {
      stats.skipped += 1;
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[${SCRIPT_NAME}] Skip mission due to normalization error: ${reason}`);
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
    console.log(`[${SCRIPT_NAME}] Sample creates`, sampleCreates.slice(0, 3).map(formatRecordForLog));
    console.log(
      `[${SCRIPT_NAME}] Sample updates`,
      sampleUpdates.slice(0, 3).map(({ before, after }) => ({ before: formatRecordForLog(before), after: formatRecordForLog(after) }))
    );
  }
};

main()
  .catch((error) => {
    console.error(`[${SCRIPT_NAME}] Error`, error);
    process.exit(1);
  })
  .finally(cleanup);
