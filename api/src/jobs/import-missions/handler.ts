import { captureException } from "../../error";
import { importService } from "../../services/import";

import { Prisma, Import as PrismaImport } from "../../db/core";
import { missionService } from "../../services/mission";
import { missionEventService } from "../../services/mission-event";
import { publisherService } from "../../services/publisher";
import publisherOrganizationService from "../../services/publisher-organization";
import { MissionEventCreateParams } from "../../types/mission-event";
import type { PublisherRecord } from "../../types/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import type { ImportedMission, ImportedOrganization } from "./types";
import { cleanDB, upsertMission, upsertOrganization } from "./utils/db";
import { enrichWithGeoloc } from "./utils/geoloc";
import { parseMission } from "./utils/mission";
import { parseOrganization } from "./utils/organization";
import { shouldCleanMissionsForPublisher } from "./utils/publisher";
import { fetchXML, parseXML } from "./utils/xml";

const CHUNK_SIZE = 2000;

export interface ImportMissionsJobPayload {
  publisherId?: string;
  recordMissionEvents?: boolean;
}

export interface ImportMissionsJobResult extends JobResult {
  start: Date;
  imports: PrismaImport[];
}

export class ImportMissionsHandler implements BaseHandler<ImportMissionsJobPayload, ImportMissionsJobResult> {
  name = "Import des flux XML";

  async handle(payload: ImportMissionsJobPayload): Promise<ImportMissionsJobResult> {
    const start = new Date();
    console.log(`[Import XML] Starting at ${start.toISOString()}`);

    const imports = [] as PrismaImport[];
    let publishers: PublisherRecord[] = [];
    if (payload.publisherId) {
      const publisher = await publisherService.findOnePublisherById(payload.publisherId);
      if (!publisher) {
        throw new Error(`Publisher ${payload.publisherId} not found`);
      }
      publishers = [publisher];
    } else {
      publishers = await publisherService.findPublishers({ role: "annonceur" });
    }

    let processed = 0;
    let updated = 0;
    let created = 0;
    let deleted = 0;
    for (let i = 0; i < publishers.length; i++) {
      const startPublisherImportAt = new Date();
      const publisher = publishers[i];
      try {
        if (!publisher.feed) {
          console.log(`[Import XML] Publisher ${publisher.name} has no feed`);
          continue;
        }
        const res = await importMissionssForPublisher(publisher, start, {
          recordMissionEvents: payload.recordMissionEvents ?? true,
        });
        if (!res) {
          continue;
        }
        await importService.createImport({
          name: res.name,
          publisherId: res.publisherId as unknown as string,
          startedAt: startPublisherImportAt,
          finishedAt: res.finishedAt ?? null,
          status: res.status,
          missionCount: res.missionCount,
          refusedCount: res.refusedCount,
          createdCount: res.createdCount,
          deletedCount: res.deletedCount,
          updatedCount: res.updatedCount,
          error: res.error ?? null,
          failed: res.failed,
        });

        processed += res.missionCount;
        updated += res.updatedCount;
        created += res.createdCount;
        deleted += res.deletedCount;

        imports.push(res);
      } catch (error: any) {
        captureException(`Import XML failed`, { extra: { publishers, payload } });
      }
    }

    console.log(`[Import XML] Ended at ${new Date().toISOString()}`);
    return {
      success: true,
      start,
      timestamp: new Date(),
      imports,
      message: `\t• Nombre de missions totales: ${processed}\n\t• Nombre de missions mises à jour: ${updated}\n\t• Nombre de missions créées: ${created}\n\t• Nombre de missions supprimées: ${deleted}`,
    };
  }
}

async function importMissionssForPublisher(publisher: PublisherRecord, start: Date, options: { recordMissionEvents: boolean }): Promise<PrismaImport | undefined> {
  if (!publisher) {
    return;
  }

  const obj = {
    name: `${publisher.name}`,
    publisherId: publisher.id,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    missionCount: 0,
    refusedCount: 0,
    startedAt: start,
    finishedAt: null,
    status: "SUCCESS",
    failed: { data: [] } as unknown as Prisma.JsonValue,
  } as PrismaImport;

  try {
    // PARSE XML
    const xml = await fetchXML(publisher);
    if (!xml.ok) {
      console.log(`[${publisher.name}] Failed to fetch xml`);
      obj.finishedAt = new Date();
      obj.status = "FAILED";
      obj.error = `${xml.status} - ${xml.error ?? "Failed to fetch xml"}`;
      return obj;
    }

    console.log(`[${publisher.name}] Parsing xml`);
    const missionsXML = parseXML(xml.data);

    // Clean missions if no XML feed is sucessful for 7 days
    if (typeof missionsXML === "string" || !missionsXML.length) {
      if (await shouldCleanMissionsForPublisher(publisher.id)) {
        console.log(`[${publisher.name}] Empty xml, cleaning missions...`);
        const deletedCount = await missionService.updateMany({ publisherId: publisher.id, deletedAt: null, updatedAt: { lt: start } }, { deletedAt: new Date() });
        console.log(`[${publisher.name}] Deleted ${deletedCount} missions`);
        obj.deletedCount = deletedCount;
      } else {
        console.log(`[${publisher.name}] Empty xml, but do not clean missions for now`);
      }

      obj.finishedAt = new Date();
      obj.status = "FAILED";
      obj.error = typeof missionsXML === "string" ? missionsXML : "Empty xml";
      return obj;
    }
    console.log(`[${publisher.name}] Found ${missionsXML.length} missions in XML`);

    // GET COUNT MISSIONS IN DB
    const missionsDB = await missionService.countBy({
      publisherId: publisher.id,
      deletedAt: null,
    });
    console.log(`[${publisher.name}] Found ${missionsDB} missions in DB`);

    let hasFailed: boolean = false;
    const allMissionsClientIds = [] as string[];
    const startTime = obj.startedAt ?? new Date();
    for (let i = 0; i < missionsXML.length; i += CHUNK_SIZE) {
      const chunk = missionsXML.slice(i, i + CHUNK_SIZE);
      console.log(`[${publisher.name}] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(missionsXML.length / CHUNK_SIZE)} (${chunk.length} missions)`);

      const existingMissions = await missionService.findMissionsBy({ publisherId: publisher.id, clientId: { in: chunk.map((m) => m.clientId.toString()) } });
      const existingMap = new Map(existingMissions.map((m) => [m.clientId, m]));

      const missions = [] as ImportedMission[];
      const organizations = new Map<string, ImportedOrganization>();

      for (let j = 0; j < chunk.length; j++) {
        const missionXML = chunk[j];
        const clientId = missionXML.clientId?.toString();
        if (!clientId) {
          console.error(`[${publisher.name}] Missing clientId for mission ${JSON.stringify(missionXML)}`);
          continue;
        }

        const organization = parseOrganization(publisher, missionXML);
        if (!organization) {
          continue;
        }
        organizations.set(organization.clientId, organization);

        const existing = existingMap.get(clientId);
        const mission = parseMission(publisher, { ...missionXML, clientId }, (existing as any) || null, startTime);
        if (!mission) {
          continue;
        }
        mission.organizationClientId = organization.clientId || null;
        missions.push(mission);
      }

      allMissionsClientIds.push(...missions.map((m) => m.clientId.toString()));

      // GEOLOC
      const resultGeoloc = await enrichWithGeoloc(publisher, missions);
      resultGeoloc.forEach((r) => {
        const mission = missions.find((m) => m.clientId.toString() === r.clientId.toString());
        if (mission && r.addressIndex < mission.addresses.length) {
          const address = mission.addresses[r.addressIndex];
          address.street = r.street || "";
          address.city = r.city || "";
          address.postalCode = r.postalCode || "";
          address.departmentCode = r.departmentCode || "";
          address.departmentName = r.departmentName || "";
          address.region = r.region || "";
          if (r.location?.lat && r.location?.lon) {
            address.location = { lat: r.location.lat, lon: r.location.lon };
            address.geoPoint = r.geoPoint || null;
          }
          address.geolocStatus = r.geolocStatus;
        }
      });

      // UPSERT ORGANIZATIONS
      console.log(`[${publisher.name}] Upserting ${organizations.size} organizations`);
      const existingOrganizations = await publisherOrganizationService.findMany({
        publisherId: publisher.id,
        clientIds: Array.from(organizations.keys()),
      });
      const existingOrganizationsMap = new Map(existingOrganizations.map((o) => [o.clientId, o]));
      console.log(`[${publisher.name}] Found ${existingOrganizations.length} existing organizations`);
      let createdOrganizationsCount = 0;
      let updatedOrganizationsCount = 0;
      let unchangedOrganizationsCount = 0;
      for (const organization of organizations.values()) {
        const existing = existingOrganizationsMap.get(organization.clientId) || null;
        const result = await upsertOrganization(organization, existing);
        if (result.action === "unchanged") {
          unchangedOrganizationsCount += 1;
        }
        existingOrganizationsMap.set(organization.clientId, result.organization);
        createdOrganizationsCount += result.action === "created" ? 1 : 0;
        updatedOrganizationsCount += result.action === "updated" ? 1 : 0;
      }
      console.log(`[${publisher.name}] ${createdOrganizationsCount} created, ${updatedOrganizationsCount} updated and ${unchangedOrganizationsCount} unchanged organizations`);

      // UPSERT MISSIONS
      console.log(`[${publisher.name}] Upserting ${missions.length} missions`);
      let createdMissionsCount = 0;
      let updatedMissionsCount = 0;
      let unchangedMissionsCount = 0;
      const missionEvents: MissionEventCreateParams[] = [];
      for (const mission of missions) {
        if (mission.organizationClientId) {
          const publisherOrganization = existingOrganizationsMap.get(mission.organizationClientId) || null;
          if (!publisherOrganization) {
            console.error(`[${publisher.name}] Missing publisher organization ${mission.organizationClientId} for mission ${mission.clientId}`);
          } else {
            mission.publisherOrganizationId = publisherOrganization.id;
          }
        } else {
          console.info(`[${publisher.name}] Missing without organization clientId ${mission.clientId}`);
        }

        const existing = existingMap.get(mission.clientId) || null;
        const result = await upsertMission(mission, existing);
        existingMap.set(mission.clientId, result.mission);

        if (result.action === "created") {
          existingMap.set(mission.clientId, result.mission);
          createdMissionsCount += 1;
        } else if (result.action === "updated") {
          existingMap.set(mission.clientId, result.mission);
          updatedMissionsCount += 1;
        } else if (result.action === "unchanged") {
          unchangedMissionsCount += 1;
        }

        if (result.event) {
          missionEvents.push(result.event);
        }
      }
      console.log(`[${publisher.name}] ${createdMissionsCount} created, ${updatedMissionsCount} updated and ${unchangedMissionsCount} unchanged missions`);
      obj.createdCount += createdMissionsCount;
      obj.updatedCount += updatedMissionsCount;

      // CREATE MISSION EVENTS
      console.log(`[${publisher.name}] Creating ${missionEvents.length} mission events`);
      if (options.recordMissionEvents && missionEvents.length > 0) {
        await missionEventService.createMissionEvents(missionEvents);
      }
      console.log(`[${publisher.name}] ${missionEvents.length} mission events created`);
    }

    // CLEAN DB
    if (!hasFailed) {
      // If one chunk failed, don't remove missions from DB
      await cleanDB(allMissionsClientIds, publisher, obj, options);
    }

    // STATS
    obj.missionCount = await missionService.countBy({
      publisherId: publisher.id,
      deletedAt: null,
    });
    obj.refusedCount = await missionService.countBy({
      publisherId: publisher.id,
      deletedAt: null,
      statusCode: "REFUSED",
    });
  } catch (error: any) {
    captureException(error, { extra: { publisher } });
    obj.status = "FAILED";
    obj.error = error.message;
  }

  console.log(`[${publisher.name}] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
  obj.finishedAt = new Date();
  return obj;
}
