import { randomUUID } from "crypto";

import { Prisma, Import as PrismaImport } from "../../../db/core";
import { prismaCore } from "../../../db/postgres";
import { captureException } from "../../../error";
import { missionEventRepository } from "../../../repositories/mission-event";
import type { MissionRecord } from "../../../types/mission";
import type { MissionEventCreateParams } from "../../../types/mission-event";
import type { PublisherRecord } from "../../../types/publisher";
import { chunk } from "../../../utils/array";
import { getJobTime } from "../../../utils/job";
import { EVENT_TYPES, IMPORT_FIELDS_TO_COMPARE, type MissionAddressWithLocation, getMissionChanges, normalizeMissionAddresses } from "../../../utils/mission";
import type { ImportedMission } from "../types";

const MISSION_EVENT_BATCH_SIZE = 500;
const MISSION_UPDATE_BATCH_SIZE = 200;

type ExistingMissionForImport = Pick<
  MissionRecord,
  | "id"
  | "clientId"
  | "title"
  | "description"
  | "descriptionHtml"
  | "tags"
  | "tasks"
  | "audience"
  | "softSkills"
  | "requirements"
  | "romeSkills"
  | "reducedMobilityAccessible"
  | "closeToTransport"
  | "openToMinors"
  | "remote"
  | "schedule"
  | "duration"
  | "postedAt"
  | "startAt"
  | "endAt"
  | "priority"
  | "places"
  | "placesStatus"
  | "metadata"
  | "domainOriginal"
  | "type"
  | "snu"
  | "snuPlaces"
  | "compensationAmount"
  | "compensationUnit"
  | "compensationType"
  | "lastSyncAt"
  | "applicationUrl"
  | "statusCode"
  | "statusComment"
  | "organizationClientId"
  | "organizationId"
  | "deletedAt"
  | "lastExportedToPgAt"
  | "createdAt"
> & {
  domain: { name: string; logo: string | null } | null;
  activity: { name: string } | null;
  addresses: MissionAddressWithLocation[];
};

export const fetchExistingMissionsForImport = async (publisherId: string, clientIds: string[]): Promise<MissionRecord[]> => {
  const uniqueClientIds = Array.from(new Set(clientIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueClientIds.length) {
    return [];
  }

  const missions = await prismaCore.mission.findMany({
    where: { publisherId, clientId: { in: uniqueClientIds } },
    select: {
      id: true,
      clientId: true,
      title: true,
      description: true,
      descriptionHtml: true,
      tags: true,
      tasks: true,
      audience: true,
      softSkills: true,
      requirements: true,
      romeSkills: true,
      reducedMobilityAccessible: true,
      closeToTransport: true,
      openToMinors: true,
      remote: true,
      schedule: true,
      duration: true,
      postedAt: true,
      startAt: true,
      endAt: true,
      priority: true,
      places: true,
      placesStatus: true,
      metadata: true,
      domainOriginal: true,
      type: true,
      snu: true,
      snuPlaces: true,
      compensationAmount: true,
      compensationUnit: true,
      compensationType: true,
      lastSyncAt: true,
      applicationUrl: true,
      statusCode: true,
      statusComment: true,
      organizationClientId: true,
      organizationId: true,
      deletedAt: true,
      lastExportedToPgAt: true,
      createdAt: true,
      domain: { select: { name: true, logo: true } },
      activity: { select: { name: true } },
      addresses: {
        select: {
          id: true,
          street: true,
          postalCode: true,
          departmentName: true,
          departmentCode: true,
          city: true,
          region: true,
          country: true,
          locationLat: true,
          locationLon: true,
          geolocStatus: true,
        },
      },
    },
  });

  const toMissionRecordForImport = (mission: ExistingMissionForImport): MissionRecord => {
    const addresses = normalizeMissionAddresses(mission.addresses) as MissionRecord["addresses"];
    const location = addresses[0]?.location ?? null;
    const primaryAddress = addresses[0] ?? {};
    const record: MissionRecord = {
      _id: mission.id,
      id: mission.id,
      clientId: mission.clientId,
      publisherId,
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
      soft_skills: [],
      requirements: mission.requirements ?? [],
      romeSkills: mission.romeSkills ?? [],
      reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
      closeToTransport: mission.closeToTransport ?? null,
      openToMinors: mission.openToMinors ?? null,
      remote: (mission.remote as any) ?? null,
      schedule: mission.schedule ?? null,
      duration: mission.duration ?? null,
      postedAt: mission.postedAt ?? null,
      startAt: mission.startAt ?? null,
      endAt: mission.endAt ?? null,
      priority: mission.priority ?? null,
      places: mission.places ?? null,
      placesStatus: (mission.placesStatus as any) ?? null,
      metadata: mission.metadata ?? null,
      domain: mission.domain?.name ?? null,
      domainOriginal: mission.domainOriginal ?? null,
      domainLogo: mission.domain?.logo ?? null,
      activity: mission.activity?.name ?? null,
      type: mission.type ?? null,
      snu: Boolean(mission.snu),
      snuPlaces: mission.snuPlaces ?? null,
      compensationAmount: mission.compensationAmount ?? null,
      compensationUnit: (mission.compensationUnit as any) ?? null,
      compensationType: (mission.compensationType as any) ?? null,
      adresse: (primaryAddress as any).street ?? null,
      address: (primaryAddress as any).street ?? null,
      postalCode: (primaryAddress as any).postalCode ?? null,
      departmentName: (primaryAddress as any).departmentName ?? null,
      departmentCode: (primaryAddress as any).departmentCode ?? null,
      city: (primaryAddress as any).city ?? null,
      region: (primaryAddress as any).region ?? null,
      country: (primaryAddress as any).country ?? null,
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
      statusCode: mission.statusCode as any,
      statusComment: mission.statusComment ?? null,
      deletedAt: mission.deletedAt ?? null,
      letudiantUpdatedAt: null,
      letudiantError: null,
      lastExportedToPgAt: mission.lastExportedToPgAt ?? null,
      createdAt: mission.createdAt,
      updatedAt: mission.createdAt,
    };
    return record;
  };

  return (missions as ExistingMissionForImport[]).map(toMissionRecordForImport);
};

const normalizeOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const resolveDomainIds = async (missions: ImportedMission[]): Promise<Map<string, string>> => {
  const candidates = new Map<string, string | null>();
  for (const mission of missions) {
    const name = normalizeOptionalString(mission.domain);
    if (!name) {
      continue;
    }
    const logo = normalizeOptionalString(mission.domainLogo);
    const current = candidates.get(name);
    if (!current && logo) {
      candidates.set(name, logo);
    } else if (current === undefined) {
      candidates.set(name, logo);
    }
  }

  const names = Array.from(candidates.keys());
  if (!names.length) {
    return new Map();
  }

  const existing = await prismaCore.domain.findMany({ where: { name: { in: names } }, select: { id: true, name: true, logo: true } });
  const result = new Map(existing.map((d) => [d.name, d.id]));

  for (const domain of existing) {
    const incomingLogo = candidates.get(domain.name) ?? null;
    if (incomingLogo && !domain.logo) {
      await prismaCore.domain.update({ where: { id: domain.id }, data: { logo: incomingLogo } });
    }
  }

  for (const name of names) {
    if (result.has(name)) {
      continue;
    }
    const logo = candidates.get(name) ?? null;
    try {
      const created = await prismaCore.domain.create({ data: { name, ...(logo ? { logo } : {}) }, select: { id: true } });
      result.set(name, created.id);
    } catch (error) {
      const maybeUnique = error as { code?: string };
      if (maybeUnique?.code === "P2002") {
        const existing = await prismaCore.domain.findUnique({ where: { name }, select: { id: true } });
        if (existing) {
          result.set(name, existing.id);
          continue;
        }
      }
      throw error;
    }
  }

  return result;
};

const resolveActivityIds = async (missions: ImportedMission[]): Promise<Map<string, string>> => {
  const names = Array.from(new Set(missions.map((mission) => normalizeOptionalString(mission.activity)).filter((name): name is string => Boolean(name))));
  if (!names.length) {
    return new Map();
  }

  const existing = await prismaCore.activity.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
  const result = new Map(existing.map((a) => [a.name, a.id]));

  for (const name of names) {
    if (result.has(name)) {
      continue;
    }
    try {
      const created = await prismaCore.activity.create({ data: { name }, select: { id: true } });
      result.set(name, created.id);
    } catch (error) {
      const maybeUnique = error as { code?: string };
      if (maybeUnique?.code === "P2002") {
        const existing = await prismaCore.activity.findUnique({ where: { name }, select: { id: true } });
        if (existing) {
          result.set(name, existing.id);
          continue;
        }
      }
      throw error;
    }
  }

  return result;
};

const mapAddressesForCreateMany = (missionId: string, addresses: MissionRecord["addresses"] | undefined): Prisma.MissionAddressCreateManyInput[] => {
  if (!addresses?.length) {
    return [];
  }
  return addresses.map((address) => ({
    missionId,
    street: normalizeOptionalString(address.street),
    postalCode: normalizeOptionalString(address.postalCode),
    departmentName: normalizeOptionalString(address.departmentName),
    departmentCode: normalizeOptionalString(address.departmentCode),
    city: normalizeOptionalString(address.city),
    region: normalizeOptionalString(address.region),
    country: normalizeOptionalString(address.country),
    locationLat: address.location?.lat ?? null,
    locationLon: address.location?.lon ?? null,
    geolocStatus: normalizeOptionalString((address as any).geolocStatus),
  }));
};

const mapChangesToJsonInput = (changes: MissionEventCreateParams["changes"]): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (changes === undefined) {
    return undefined;
  }
  if (changes === null) {
    return Prisma.JsonNull;
  }
  return changes as Prisma.InputJsonValue;
};

const createMissionEvents = async (events: MissionEventCreateParams[]) => {
  if (!events.length) {
    return 0;
  }
  const data: Prisma.MissionEventCreateManyInput[] = events.map((event) => ({
    missionId: event.missionId,
    type: event.type as any,
    createdBy: event.createdBy ?? null,
    changes: mapChangesToJsonInput(event.changes),
  }));

  let total = 0;
  for (const batch of chunk(data, MISSION_EVENT_BATCH_SIZE)) {
    const result = await missionEventRepository.createMany(batch);
    total += result.count;
  }
  return total;
};

export const bulkDB = async (bulk: ImportedMission[], publisher: PublisherRecord, importDoc: PrismaImport, existingByClientId: Map<string, MissionRecord>): Promise<boolean> => {
  try {
    const startedAt = new Date();
    console.log(`[${publisher.name}] Starting ${bulk.length} missions import at ${startedAt.toISOString()}`);

    const syncAt = importDoc.startedAt ?? new Date();
    const missions = bulk.filter(Boolean);
    const clientIds = Array.from(new Set(missions.map((m) => String(m.clientId)).filter(Boolean)));

    console.log(`[${publisher.name}] Found ${existingByClientId.size} existing missions in DB`);

    const [domainIds, activityIds] = await Promise.all([resolveDomainIds(missions), resolveActivityIds(missions)]);

    const toCreate: Array<{ id: string; mission: ImportedMission }> = [];
    const toUpdate: Array<{ existing: MissionRecord; mission: ImportedMission; changes: NonNullable<ReturnType<typeof getMissionChanges>> }> = [];
    const missionEvents: MissionEventCreateParams[] = [];

    for (const mission of missions) {
      const current = existingByClientId.get(String(mission.clientId));
      if (!current) {
        const id = randomUUID();
        toCreate.push({ id, mission });
        missionEvents.push({ missionId: id, type: EVENT_TYPES.CREATE, changes: null });
        continue;
      }

      const changes = getMissionChanges(current, mission as MissionRecord, IMPORT_FIELDS_TO_COMPARE);
      if (changes) {
        toUpdate.push({ existing: current, mission, changes });
        missionEvents.push({
          missionId: current.id,
          type: changes.deletedAt?.current === null ? EVENT_TYPES.DELETE : EVENT_TYPES.UPDATE,
          changes,
        });
      }
    }

    if (toCreate.length > 0) {
      const data: Prisma.MissionCreateManyInput[] = toCreate.map(({ id, mission }) => {
        const domainName = normalizeOptionalString(mission.domain);
        const activityName = normalizeOptionalString(mission.activity);
        return {
          id,
          clientId: String(mission.clientId),
          publisherId: publisher.id,
          title: mission.title,
          description: mission.description ?? null,
          descriptionHtml: mission.descriptionHtml ?? null,
          tags: mission.tags ?? [],
          tasks: mission.tasks ?? [],
          audience: mission.audience ?? [],
          softSkills: mission.softSkills ?? mission.soft_skills ?? [],
          requirements: mission.requirements ?? [],
          romeSkills: mission.romeSkills ?? [],
          reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
          closeToTransport: mission.closeToTransport ?? null,
          openToMinors: mission.openToMinors ?? null,
          remote: (mission.remote as any) ?? null,
          schedule: mission.schedule ?? null,
          duration: mission.duration ?? null,
          postedAt: mission.postedAt ?? null,
          startAt: mission.startAt ?? null,
          endAt: mission.endAt ?? null,
          priority: mission.priority ?? null,
          places: mission.places ?? null,
          placesStatus: (mission.placesStatus as any) ?? null,
          metadata: mission.metadata ?? null,
          domainId: domainName ? (domainIds.get(domainName) ?? null) : null,
          activityId: activityName ? (activityIds.get(activityName) ?? null) : null,
          domainOriginal: mission.domainOriginal ?? null,
          type: (mission.type as any) ?? null,
          snu: mission.snu ?? false,
          snuPlaces: mission.snuPlaces ?? null,
          compensationAmount: mission.compensationAmount ?? null,
          compensationUnit: (mission.compensationUnit as any) ?? null,
          compensationType: (mission.compensationType as any) ?? null,
          lastSyncAt: syncAt,
          applicationUrl: mission.applicationUrl ?? null,
          statusCode: (mission.statusCode as any) ?? "ACCEPTED",
          statusComment: mission.statusComment ?? null,
          organizationClientId: mission.organizationClientId ?? null,
          organizationId: mission.organizationId ?? null,
          deletedAt: mission.deletedAt ?? null,
          lastExportedToPgAt: mission.lastExportedToPgAt ?? null,
        };
      });

      const createResult = await prismaCore.mission.createMany({ data });
      importDoc.createdCount += createResult.count;

      const addressData = toCreate.flatMap(({ id, mission }) => mapAddressesForCreateMany(id, mission.addresses));
      if (addressData.length > 0) {
        await prismaCore.missionAddress.createMany({ data: addressData });
      }
    }

    if (toUpdate.length > 0) {
      const updateOps: Prisma.PrismaPromise<unknown>[] = [];

      for (const { existing, mission, changes } of toUpdate) {
        const data: Prisma.MissionUncheckedUpdateInput = {};

        const assign = <K extends keyof Prisma.MissionUncheckedUpdateInput>(key: K, value: Prisma.MissionUncheckedUpdateInput[K]) => {
          (data as any)[key] = value;
        };

        for (const key of Object.keys(changes) as Array<keyof MissionRecord>) {
          switch (key) {
            case "domain": {
              const domainName = normalizeOptionalString(mission.domain);
              assign("domainId", domainName ? (domainIds.get(domainName) ?? null) : null);
              break;
            }
            case "activity": {
              const activityName = normalizeOptionalString(mission.activity);
              assign("activityId", activityName ? (activityIds.get(activityName) ?? null) : null);
              break;
            }
            case "title":
              assign("title", mission.title);
              break;
            case "description":
              assign("description", mission.description ?? null);
              break;
            case "descriptionHtml":
              assign("descriptionHtml", mission.descriptionHtml ?? null);
              break;
            case "tags":
              assign("tags", mission.tags ?? []);
              break;
            case "tasks":
              assign("tasks", mission.tasks ?? []);
              break;
            case "audience":
              assign("audience", mission.audience ?? []);
              break;
            case "softSkills":
              assign("softSkills", mission.softSkills ?? mission.soft_skills ?? []);
              break;
            case "requirements":
              assign("requirements", mission.requirements ?? []);
              break;
            case "romeSkills":
              assign("romeSkills", mission.romeSkills ?? []);
              break;
            case "reducedMobilityAccessible":
              assign("reducedMobilityAccessible", mission.reducedMobilityAccessible ?? null);
              break;
            case "closeToTransport":
              assign("closeToTransport", mission.closeToTransport ?? null);
              break;
            case "openToMinors":
              assign("openToMinors", mission.openToMinors ?? null);
              break;
            case "remote":
              assign("remote", (mission.remote as any) ?? null);
              break;
            case "schedule":
              assign("schedule", mission.schedule ?? null);
              break;
            case "duration":
              assign("duration", mission.duration ?? null);
              break;
            case "postedAt":
              assign("postedAt", mission.postedAt ?? null);
              break;
            case "startAt":
              assign("startAt", mission.startAt ?? null);
              break;
            case "endAt":
              assign("endAt", mission.endAt ?? null);
              break;
            case "priority":
              assign("priority", mission.priority ?? null);
              break;
            case "places":
              assign("places", mission.places ?? null);
              break;
            case "metadata":
              assign("metadata", mission.metadata ?? null);
              break;
            case "type":
              assign("type", (mission.type as any) ?? null);
              break;
            case "snu":
              assign("snu", mission.snu ?? false);
              break;
            case "snuPlaces":
              assign("snuPlaces", mission.snuPlaces ?? null);
              break;
            case "compensationAmount":
              assign("compensationAmount", mission.compensationAmount ?? null);
              break;
            case "compensationUnit":
              assign("compensationUnit", (mission.compensationUnit as any) ?? null);
              break;
            case "compensationType":
              assign("compensationType", (mission.compensationType as any) ?? null);
              break;
            case "applicationUrl":
              assign("applicationUrl", mission.applicationUrl ?? null);
              break;
            case "organizationClientId":
              assign("organizationClientId", mission.organizationClientId ?? null);
              break;
            case "organizationId":
              assign("organizationId", mission.organizationId ?? null);
              break;
            case "statusCode":
              assign("statusCode", (mission.statusCode as any) ?? "ACCEPTED");
              break;
            case "statusComment":
              assign("statusComment", mission.statusComment ?? null);
              break;
            case "deletedAt":
              assign("deletedAt", mission.deletedAt ?? null);
              break;
            default:
              break;
          }
        }

        updateOps.push(prismaCore.mission.update({ where: { id: existing.id }, data }));

        if ("addresses" in changes) {
          updateOps.push(prismaCore.missionAddress.deleteMany({ where: { missionId: existing.id } }));
          const addressData = mapAddressesForCreateMany(existing.id, mission.addresses);
          if (addressData.length > 0) {
            updateOps.push(prismaCore.missionAddress.createMany({ data: addressData }));
          }
        }
      }

      for (const batch of chunk(updateOps, MISSION_UPDATE_BATCH_SIZE)) {
        await prismaCore.$transaction(batch);
      }

      importDoc.updatedCount += toUpdate.length;
    }

    if (clientIds.length > 0) {
      await prismaCore.mission.updateMany({ where: { publisherId: publisher.id, clientId: { in: clientIds } }, data: { lastSyncAt: syncAt } });
    }

    if (missionEvents.length > 0) {
      await createMissionEvents(missionEvents);
    }

    const time = getJobTime(startedAt);
    console.log(`[${publisher.name}] Mission write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}, took ${time}`);
    return true;
  } catch (error) {
    captureException(error, { extra: { publisher } });
    return false;
  }
};

/**
 * Clean missions in DB
 * Every mission of the publisher that has not been "seen" during this run (via `lastSyncAt`) is deleted.
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 */
export const cleanDB = async (publisher: PublisherRecord, importDoc: PrismaImport) => {
  console.log(`[${publisher.name}] Cleaning missions...`);

  const syncAt = importDoc.startedAt ?? new Date();

  const toDelete = await prismaCore.mission.findMany({
    where: {
      publisherId: publisher.id,
      deletedAt: null,
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: syncAt } }],
    },
    select: { id: true },
  });

  if (!toDelete.length) {
    importDoc.deletedCount = 0;
    console.log(`[${publisher.name}] Mission cleaning removed 0`);
    return;
  }

  const events: MissionEventCreateParams[] = toDelete.map((mission) => ({
    missionId: mission.id,
    type: EVENT_TYPES.DELETE,
    changes: { deletedAt: true },
  }));

  await prismaCore.mission.updateMany({
    where: { id: { in: toDelete.map((m) => m.id) } },
    data: { deletedAt: syncAt },
  });

  await createMissionEvents(events);

  importDoc.deletedCount = toDelete.length;
  console.log(`[${publisher.name}] Mission cleaning removed ${toDelete.length}`);
};
