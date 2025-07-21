import { captureException } from "../../error";
import ImportModel from "../../models/import";
import PublisherModel from "../../models/publisher";

import MissionModel from "../../models/mission";
import { Import, Mission, Publisher } from "../../types";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { bulkDB, cleanDB } from "./utils/db";
import { enrichWithGeoloc } from "./utils/geoloc";
import { buildData } from "./utils/mission";
import { verifyOrganization } from "./utils/organization";
import { parseXML } from "./utils/xml";

const CHUNK_SIZE = 2000;

export interface ImportMissionsJobPayload {
  publisherId?: string;
}

export interface ImportMissionsJobResult extends JobResult {
  start: Date;
  imports: Import[];
}

export class ImportMissionsHandler implements BaseHandler<ImportMissionsJobPayload, ImportMissionsJobResult> {
  async handle(payload: ImportMissionsJobPayload): Promise<ImportMissionsJobResult> {
    const start = new Date();
    console.log(`[Import XML] Starting at ${start.toISOString()}`);

    const imports = [] as Import[];
    let publishers = [] as Publisher[];
    if (payload.publisherId) {
      publishers = [await PublisherModel.findById(payload.publisherId)] as Publisher[];
    } else {
      publishers = await PublisherModel.find({ isAnnonceur: true });
    }

    for (let i = 0; i < publishers.length; i++) {
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
        await ImportModel.create(res);
        imports.push(res);
      } catch (error: any) {
        captureException(`Import XML failed`, `${error.message} while creating import for ${publisher.name} (${publisher._id})`);
      }
    }
    console.log(`[Import XML] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
    return {
      success: true,
      start,
      timestamp: new Date(),
      imports,
    };
  }
}

async function importMissionssForPublisher(publisher: Publisher, start: Date): Promise<Import | undefined> {
  if (!publisher) {
    return;
  }

  const obj = {
    name: `${publisher.name}`,
    publisherId: publisher._id,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    missionCount: 0,
    refusedCount: 0,
    startedAt: start,
    endedAt: null,
    status: "SUCCESS",
    failed: { data: [] },
  } as Import;

  try {
    const headers = new Headers();

    if (publisher.feedUsername && publisher.feedPassword) {
      headers.set("Authorization", `Basic ${btoa(`${publisher.feedUsername}:${publisher.feedPassword}`)}`);
    }
    const xml = await fetch(publisher.feed, { headers }).then((response) => response.text());

    // PARSE XML
    console.log(`[${publisher.name}] Parse xml from ${publisher.feed}`);
    const missionsXML = parseXML(xml);
    if (!missionsXML || !missionsXML.length) {
      console.log(`[${publisher.name}] Empty xml, mongo cleaning...`);
      const mongoRes = await MissionModel.updateMany({ publisherId: publisher._id, deletedAt: null, updatedAt: { $lt: start } }, { deleted: true, deletedAt: new Date() });
      console.log(`[${publisher.name}] Mongo cleaning deleted ${mongoRes.modifiedCount}`);
      obj.endedAt = new Date();
      return obj;
    }
    console.log(`[${publisher.name}] Found ${missionsXML.length} missions in XML`);

    // GET COUNT MISSIONS IN DB
    const missionsDB = await MissionModel.countDocuments({
      publisherId: publisher._id,
      deletedAt: null,
    });
    console.log(`[${publisher.name}] Found ${missionsDB} missions in DB`);

    let hasFailed: boolean = false;
    const allMissions = [] as Mission[];
    for (let i = 0; i < missionsXML.length; i += CHUNK_SIZE) {
      const chunk = missionsXML.slice(i, i + CHUNK_SIZE);
      console.log(`[${publisher.name}] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(missionsXML.length / CHUNK_SIZE)} (${chunk.length} missions)`);
      // BUILD NEW MISSIONS
      const missions = [] as Mission[];
      const promises = [] as Promise<Mission | undefined>[];
      for (let j = 0; j < chunk.length; j++) {
        const missionXML = chunk[j];
        promises.push(buildData(obj.startedAt, publisher, missionXML));

        if (j % 50 === 0) {
          const res = await Promise.all(promises);
          res.forEach((e: Mission | undefined) => e && missions.push(e));
          promises.length = 0;
        }
      }
      if (promises.length > 0) {
        const res = await Promise.all(promises);
        res.forEach((e: Mission | undefined) => e && missions.push(e));
      }
      allMissions.push(...missions);

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
            address.geoPoint = r.geoPoint || undefined;
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
      await cleanDB(allMissions, publisher, obj);
    }

    // STATS
    obj.missionCount = await MissionModel.countDocuments({
      publisherId: publisher._id,
      deletedAt: null,
    });
    obj.refusedCount = await MissionModel.countDocuments({
      publisherId: publisher._id,
      deletedAt: null,
      statusCode: "REFUSED",
    });
  } catch (error: any) {
    captureException(error, `Error while importing publisher ${publisher.name}`);
    obj.status = "FAILED";
    obj.error = error.message;
  }

  console.log(`[${publisher.name}] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
  obj.endedAt = new Date();
  return obj;
}
