import { captureException } from "../../error";
import { importService } from "../../services/import";

import { Prisma, Import as PrismaImport } from "../../db/core";
import { missionService } from "../../services/mission";
import { publisherService } from "../../services/publisher";
import type { PublisherRecord } from "../../types/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import type { ImportedMission } from "./types";
import { bulkDB, cleanDB } from "./utils/db";
import { enrichWithGeoloc } from "./utils/geoloc";
import { buildData } from "./utils/mission";
import { verifyOrganization } from "./utils/organization";
import { shouldCleanMissionsForPublisher } from "./utils/publisher";
import { fetchXML, parseXML } from "./utils/xml";

const CHUNK_SIZE = 2000;

export interface ImportMissionsJobPayload {
  publisherId?: string;
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
        const res = await importMissionssForPublisher(publisher, start);
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

async function importMissionssForPublisher(publisher: PublisherRecord, start: Date): Promise<PrismaImport | undefined> {
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
    for (let i = 0; i < missionsXML.length; i += CHUNK_SIZE) {
      const chunk = missionsXML.slice(i, i + CHUNK_SIZE);
      console.log(`[${publisher.name}] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(missionsXML.length / CHUNK_SIZE)} (${chunk.length} missions)`);

      // BUILD NEW MISSIONS
      const missions = [] as ImportedMission[];
      const promises = [] as Promise<ImportedMission | undefined>[];
      for (let j = 0; j < chunk.length; j++) {
        const missionXML = chunk[j];
        promises.push(buildData(obj.startedAt ?? new Date(), publisher, missionXML));

        if (j % 50 === 0) {
          const res = await Promise.all(promises);
          res.forEach((e: ImportedMission | undefined) => e && missions.push(e));
          promises.length = 0;
        }
      }
      if (promises.length > 0) {
        const res = await Promise.all(promises);
        res.forEach((e: ImportedMission | undefined) => e && missions.push(e));
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

      // RNA
      await verifyOrganization(missions);

      // BULK WRITE
      const res = await bulkDB(missions, publisher, obj);
      if (!res) {
        hasFailed = true;
      }
    }

    // CLEAN DB
    if (!hasFailed) {
      // If one chunk failed, don't remove missions from DB
      await cleanDB(allMissionsClientIds, publisher, obj);
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
