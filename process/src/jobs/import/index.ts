import { XMLParser } from "fast-xml-parser";
import { BulkOperationContainer, BulkUpdateAction } from "@elastic/elasticsearch/api/types";

import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import ImportModel from "../../models/import";
import esClient from "../../db/elastic";
import { MISSION_INDEX } from "../../config";

import { buildMission } from "./mission";
import { enrichWithRNA } from "./rna";
import { enrichWithGeoloc } from "./geoloc";
import { Import, Mission, MissionXML, Publisher } from "../../types";
import MissionModel from "../../models/mission";

const parseXML = (xmlString: string) => {
  const parser = new XMLParser();

  const options = {
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false, //"strict"
    stopNodes: ["parse-me-as-string"],
  };

  const res = parser.parse(xmlString, options);

  if (!res.source || !res.source.mission) return;
  if (res.source.mission && !Array.isArray(res.source.mission)) res.source.mission = [res.source.mission];

  const data = res.source.mission as MissionXML[];

  // Remove duplicates clientId
  const clientId = new Set();
  const unique = [] as MissionXML[];
  data.forEach((e) => {
    if (!clientId.has(e.clientId)) {
      clientId.add(e.clientId);
      unique.push(e);
    }
  });

  return unique;
};

const shouldEnrichGeoloc = (missionXML: MissionXML, mission: Mission, missionDB?: Mission) => {
  // If location changed, need to search
  if (missionDB && (missionDB.address !== mission.address || missionDB.city !== mission.city || missionDB.postalCode !== mission.postalCode)) return "SHOULD_ENRICH";
  // If location is already stored in database, and , don't need to search
  if (missionDB && ["ENRICHED_BY_PUBLISHER", "ENRICHED", "NOT_FOUND"].includes(missionDB.geolocStatus)) return missionDB.geolocStatus;
  // If location is given, don't need to search
  if (mission.location && mission.location.lon && mission.location.lat) return "ENRICHED_BY_PUBLISHER";
  // If no address is given, don't need to search
  if (!(missionXML.adresse || missionXML.address) && !missionXML.city && !missionXML.postalCode) return "NO_DATA";

  return "SHOULD_ENRICH";
};

const shouldEnrichRNA = (missionXML: MissionXML, mission: Mission, missionDB?: Mission) => {
  if (!missionXML.organizationRNA && !missionXML.organizationName) return "NO_DATA";
  // If organization changed, need to search
  if (missionDB && (missionDB.organizationName !== mission.organizationName || missionDB.organizationRNA !== mission.organizationRNA)) return "SHOULD_ENRICH";
  // If organization is given, don't need to search
  if (missionDB && ["ENRICHED", "NOT_FOUND"].includes(missionDB.rnaStatus)) return missionDB.rnaStatus;

  return "SHOULD_ENRICH";
};

// const buildData = (startTime: Date, publisher: Publisher, missionXML: MissionXML, missionDB?: ShortMission) => {
const buildData = async (startTime: Date, publisher: Publisher, missionXML: MissionXML) => {
  try {
    const missionDB = (await MissionModel.findOne({ publisherId: publisher._id, clientId: missionXML.clientId }).lean()) as Mission;

    const mission = buildMission(publisher, missionXML);
    mission._id = missionDB?._id;
    mission.deleted = false;
    mission.deletedAt = null;
    mission.lastSyncAt = startTime;
    mission.publisherId = publisher._id.toString();
    mission.publisherName = publisher.name;
    mission.publisherLogo = publisher.logo;
    mission.publisherUrl = publisher.url;
    mission.updatedAt = new Date();
    if (missionDB && missionDB.statusCommentHistoric && Array.isArray(missionDB.statusCommentHistoric)) {
      if (missionDB.statusCode !== mission.statusCode) {
        mission.statusCommentHistoric = [...missionDB.statusCommentHistoric, { status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
      }
    } else {
      mission.statusCommentHistoric = [{ status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
    }

    mission.geolocStatus = shouldEnrichGeoloc(missionXML, mission, missionDB);
    mission.rnaStatus = shouldEnrichRNA(missionXML, mission, missionDB);

    // Add previous moderation temporary
    mission.moderation_5f5931496c7ea514150a818f_status = missionDB?.moderation_5f5931496c7ea514150a818f_status;
    mission.moderation_5f5931496c7ea514150a818f_comment = missionDB?.moderation_5f5931496c7ea514150a818f_comment;
    mission.moderation_5f5931496c7ea514150a818f_note = missionDB?.moderation_5f5931496c7ea514150a818f_note;
    mission.moderation_5f5931496c7ea514150a818f_title = missionDB?.moderation_5f5931496c7ea514150a818f_title;
    mission.moderation_5f5931496c7ea514150a818f_date = missionDB?.moderation_5f5931496c7ea514150a818f_date;

    return mission;
  } catch (err) {
    captureException(err, `Error while parsing mission ${missionXML.clientId}`);
  }
};

const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  const index = "mission";

  // Write in mongo
  const mongoBulk = bulk.filter((e) => e).map((e) => ({ updateOne: { filter: { publisherId: publisher._id, clientId: e.clientId }, update: { $set: e }, upsert: true } }));
  const mongoUpdateRes = await MissionModel.bulkWrite(mongoBulk);
  importDoc.createdCount = mongoUpdateRes.upsertedCount;
  importDoc.updatedCount = mongoUpdateRes.modifiedCount;
  console.log(`[${publisher.name}] Mongo bulk write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}`);
  if (mongoUpdateRes.hasWriteErrors()) captureException(`Mongo bulk failed`, JSON.stringify(mongoUpdateRes.getWriteErrors(), null, 2));

  // Clean mongo
  console.log(`[${publisher.name}] Cleaning Mongo missions...`);
  const mongoDeleteRes = await MissionModel.updateMany(
    { publisherId: publisher._id, deletedAt: null, updatedAt: { $lt: importDoc.startedAt } },
    { deleted: true, deletedAt: importDoc.startedAt },
  );
  importDoc.deletedCount = mongoDeleteRes.modifiedCount;
  console.log(`[${publisher.name}] Mongo cleaning removed ${importDoc.deletedCount}`);

  // Write in ES
  const chunkSize = 1000;
  let esUpadtedCount = 0;
  for (let i = 0; i < bulk.length; i += chunkSize) {
    const missions = await MissionModel.find({ publisherId: publisher._id, deleted: false }).skip(i).limit(chunkSize).lean();

    const esChunk = [] as (BulkOperationContainer | BulkUpdateAction | Mission)[];
    missions.forEach((m) => {
      esChunk.push({ index: { _index: index, _id: m._id?.toString() || "" } });
      esChunk.push({ ...m, _id: undefined });
    });

    const esUpdateRes = await esClient.bulk({ refresh: true, body: esChunk });
    esUpadtedCount += esUpdateRes.body.items.length;

    if (esUpdateRes.body.errors) {
      console.log(JSON.stringify(esUpdateRes.body.items, null, 2));
      const errors = esUpdateRes.body.items.filter((e: any) => e.index?.error || e.update?.error);
      esUpadtedCount -= errors.length;
      errors.forEach((e: any) => importDoc.failed.data.push({ id: e.index?._id || e.update?._id, reason: e.index?.error.reason || e.update?.error.reason }));
      captureException("ES bulk failed", JSON.stringify(errors));
    }
    console.log(`[${publisher.name}] ES bulk write ${i} on ${bulk.length}`);
  }
  console.log(`[${publisher.name}] ES bulk write finished, updated ${esUpadtedCount} `);

  // clean ES
  console.log(`[${publisher.name}] Cleaning ES missions...`);
  const cleanRes = await esClient.updateByQuery({
    index: MISSION_INDEX,
    body: {
      query: { bool: { must: [{ term: { "publisherId.keyword": publisher._id } }, { term: { deleted: false } }, { range: { updatedAt: { lt: importDoc.startedAt } } }] } },
      script: { source: "ctx._source.deleted = params.deleted; ctx._source.deletedAt = params.deletedAt", params: { deleted: true, deletedAt: importDoc.startedAt } },
    },
  });
  console.log(`[${publisher.name}] ES cleaning deleted ${cleanRes.body.updated}`);
};

const importPublisher = async (publisher: Publisher, start: Date) => {
  if (!publisher || !publisher.feed) return;

  const obj = {
    name: `${publisher.name}`,
    publisherId: publisher._id,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    missionCount: 0,
    refusedCount: 0,
    startedAt: new Date(),
    endedAt: null,
    status: "SUCCESS",
    failed: { data: [] },
  } as Import;

  try {
    const headers = new Headers();

    if (publisher.feed_username && publisher.feed_password) {
      headers.set("Authorization", `Basic ${btoa(`${publisher.feed_username}:${publisher.feed_password}`)}`);
    }
    const xml = await fetch(publisher.feed, { headers }).then((response) => response.text());

    // PARSE XML
    console.log(`[${publisher.name}] Parse xml from ${publisher.feed}`);
    const missionsXML = parseXML(xml);
    if (!missionsXML || !missionsXML.length) {
      console.log(`[${publisher.name}] Empty xml`);
      console.log(`[${publisher.name}] ES cleaning...`);
      const esRes = await esClient.updateByQuery({
        index: MISSION_INDEX,
        body: {
          query: { bool: { must: [{ term: { "publisherId.keyword": publisher._id } }, { term: { deleted: false } }, { range: { updatedAt: { lt: start } } }] } },
          script: { source: "ctx._source.deleted = params.deleted; ctx._source.deletedAt = params.deletedAt", params: { deleted: true, deletedAt: new Date() } },
        },
      });
      console.log(`[${publisher.name}] ES cleaning deleted ${esRes.body.updated}`);
      obj.endedAt = new Date();
      return obj;
    }
    console.log(`[${publisher.name}] Found ${missionsXML.length} missions in XML`);

    // GET COUNT MISSIONS IN DB
    const missionsDB = await MissionModel.countDocuments({ publisherId: publisher._id, deleted: false });
    console.log(`[${publisher.name}] Found ${missionsDB} missions in DB`);

    // BUILD NEW MISSIONS
    const missions = [] as Mission[];
    const promises = [] as Promise<Mission | undefined>[];
    for (let j = 0; j < missionsXML.length; j++) {
      const missionXML = missionsXML[j];
      promises.push(buildData(obj.startedAt, publisher, missionXML));

      if (j % 50 === 0 || j === missionsXML.length - 1) {
        const res = await Promise.all(promises);
        res.filter((e) => e !== undefined).forEach((e: Mission) => missions.push(e));
        promises.length = 0;
      }
    }

    // GEOLOC
    const geolocShould = missions.filter((m) => m.geolocStatus === "SHOULD_ENRICH").map((m) => m);
    const resultGeoloc = await enrichWithGeoloc(publisher, geolocShould);
    resultGeoloc.forEach((r) => {
      const mission = missions.find((m) => m.clientId.toString() === r.clientId.toString());
      if (mission) {
        mission.address = r.address;
        mission.city = r.city;
        mission.postalCode = r.postalCode;
        mission.departmentCode = r.departmentCode;
        mission.departmentName = r.departmentName;
        mission.region = r.region;
        mission.location = r.location;
        mission.geoPoint = r.geoPoint;
        mission.geolocStatus = r.geolocStatus;
      }
    });

    // RNA
    const rnaShould = missions.filter((m) => m.rnaStatus === "SHOULD_ENRICH").map((m) => m);
    const resultRNA = await enrichWithRNA(publisher, rnaShould);
    resultRNA.forEach((r) => {
      const mission = missions.find((m) => m.clientId.toString() === r.clientId.toString());
      if (mission) {
        mission.associationRNA = r.associationRNA;
        mission.associationSiren = r.associationSiren;
        mission.associationName = r.associationName;
        mission.associationAddress = r.associationAddress;
        mission.associationCity = r.associationCity;
        mission.associationPostalCode = r.associationPostalCode;
        mission.associationDepartmentCode = r.associationDepartmentCode;
        mission.associationDepartmentName = r.associationDepartmentName;
        mission.associationRegion = r.associationRegion;
        mission.rnaStatus = r.rnaStatus;
      }
    });

    // BULK WRITE
    await bulkDB(missions, publisher, obj);

    // STATS
    const resMissionCount = await esClient.count({
      index: MISSION_INDEX,
      body: { query: { bool: { filter: [{ term: { "publisherId.keyword": publisher._id } }, { term: { deleted: false } }] } } },
    });
    obj.missionCount = resMissionCount.body.count;

    const resMissionRefused = await esClient.count({
      index: MISSION_INDEX,
      body: { query: { bool: { filter: [{ term: { "publisherId.keyword": publisher._id } }, { term: { deleted: true } }, { term: { statusCode: "REFUSED" } }] } } },
    });
    obj.refusedCount = resMissionRefused.body.count;
  } catch (error) {
    captureException(error, `Error while importing publisher ${publisher.name}`);
    console.error(JSON.stringify(error, null, 2));
    obj.status = "FAILED";
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
    publishers = await PublisherModel.find({ role_promoteur: true });
  }

  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    try {
      const res = await importPublisher(publisher, start);
      if (!res) continue;
      await ImportModel.create(res);
    } catch (error: any) {
      captureException(`Import XML failed`, `${error.message} while creating import for ${publisher.name} (${publisher._id})`);
    }
  }
  console.log(`[Import XML] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
};

export default { handler };
