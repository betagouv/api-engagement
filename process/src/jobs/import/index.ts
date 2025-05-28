import { captureException } from "../../error";
import ImportModel from "../../models/import";
import PublisherModel from "../../models/publisher";

import MissionModel from "../../models/mission";
import { Import, Mission, Publisher } from "../../types";
import { enrichWithGeoloc } from "./geoloc";
import { buildData } from "./mission";
import { verifyOrganization } from "./organization";
import { bulkDB, cleanDB } from "./utils/db";
import { parseXML } from "./utils/xml";

const CHUNK_SIZE = 2000;

const importPublisher = async (publisher: Publisher, start: Date) => {
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

    for (let i = 0; i < missionsXML.length; i += CHUNK_SIZE) {
      console.log(`[${publisher.name}] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(missionsXML.length / CHUNK_SIZE)}`);
      const chunk = missionsXML.slice(i, i + CHUNK_SIZE);
      // BUILD NEW MISSIONS
      const missions = [] as Mission[];
      const promises = [] as Promise<Mission | undefined>[];
      for (let j = 0; j < chunk.length; j++) {
        const missionXML = chunk[j];
        promises.push(buildData(obj.startedAt, publisher, missionXML));

        if (j % 50 === 0) {
          const res = await Promise.all(promises);
          res.filter((e) => e !== undefined).forEach((e: Mission) => missions.push(e));
          promises.length = 0;
        }
      }
      if (promises.length > 0) {
        const res = await Promise.all(promises);
        res.filter((e) => e !== undefined).forEach((e: Mission) => missions.push(e));
      }

      // GEOLOC
      const resultGeoloc = await enrichWithGeoloc(publisher, missions);
      resultGeoloc.forEach((r) => {
        const mission = missions.find((m) => m.clientId.toString() === r.clientId.toString());
        if (mission && r.addressIndex < mission.addresses.length) {
          const address = mission.addresses[r.addressIndex];
          address.street = r.street;
          address.city = r.city;
          address.postalCode = r.postalCode;
          address.departmentCode = r.departmentCode;
          address.departmentName = r.departmentName;
          address.region = r.region;
          if (r.location?.lat && r.location?.lon) {
            address.location = { lat: r.location.lat, lon: r.location.lon };
            address.geoPoint = r.geoPoint;
          }
          address.geolocStatus = r.geolocStatus;
        }
      });

      // RNA
      await verifyOrganization(missions);
      // BULK WRITE
      await bulkDB(missions, publisher, obj);
    }

    // CLEAN DB
    await cleanDB(publisher, obj);

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

  obj.endedAt = new Date();
  return obj;
};

const handler = async (publisherId?: string) => {
  const start = new Date();
  console.log(`[Import XML] Starting at ${start.toISOString()}`);

  let publishers = [] as Publisher[];
  if (publisherId) {
    const publisher = await PublisherModel.findById(publisherId);
    publishers = publisher ? [publisher] : [];
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
      const res = await importPublisher(publisher, start);
      if (!res) {
        continue;
      }
      await ImportModel.create(res);
    } catch (error: any) {
      captureException(`Import XML failed`, `${error.message} while creating import for ${publisher.name} (${publisher._id})`);
    }
  }
  console.log(`[Import XML] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
};

export default { handler };
