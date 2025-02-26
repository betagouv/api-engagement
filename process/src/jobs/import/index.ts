import { XMLParser } from "fast-xml-parser";

import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import ImportModel from "../../models/import";

import { buildMission } from "./mission";
import { verifyOrganization } from "./organization";
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
    isArray: (name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean) => {
      if (jpath === "source.mission.addresses.address") return true;
      return false;
    },
  };

  const res = parser.parse(xmlString, options);

  if (!res.source || !res.source.mission) return;
  if (res.source.mission && !Array.isArray(res.source.mission)) res.source.mission = [res.source.mission];

  // Remove duplicates clientId
  const clientId = new Set();
  const unique = [] as MissionXML[];
  const data = res.source.mission as MissionXML[];

  data.forEach((mission) => {
    if (!clientId.has(mission.clientId)) {
      const addresses = mission.addresses as any;
      if (addresses?.address && Array.isArray(addresses.address)) {
        mission.addresses = addresses.address;
      } else if (addresses?.address) {
        mission.addresses = [addresses.address];
      }
      clientId.add(mission.clientId);
      unique.push(mission);
    }
  });

  return unique;
};

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

    mission.organizationVerificationStatus = missionDB?.organizationVerificationStatus;
    if (missionDB && missionDB.statusCommentHistoric && Array.isArray(missionDB.statusCommentHistoric)) {
      if (missionDB.statusCode !== mission.statusCode) {
        mission.statusCommentHistoric = [...missionDB.statusCommentHistoric, { status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
      }
    } else {
      mission.statusCommentHistoric = [{ status: mission.statusCode, comment: mission.statusComment, date: mission.updatedAt }];
    }

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
};

const importPublisher = async (publisher: Publisher, start: Date) => {
  if (!publisher) return;

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

      console.log(`[${publisher.name}] Mongo cleaning...`);
      const mongoRes = await MissionModel.updateMany({ publisherId: publisher._id, deletedAt: null, updatedAt: { $lt: start } }, { deleted: true, deletedAt: new Date() });
      console.log(`[${publisher.name}] Mongo cleaning deleted ${mongoRes.modifiedCount}`);
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
    console.log(`[Organization] Starting organization verification for ${missions.length} missions`);
    const resultRNA = await verifyOrganization(missions);
    console.log(`[Organization] Received ${resultRNA.length} verification results`);

    resultRNA.forEach((r) => {
      const mission = missions.find((m) => m.clientId.toString() === r.clientId.toString());
      if (mission) {
        mission.organizationId = r.organizationId;
        mission.organizationNameVerified = r.organizationNameVerified;
        mission.organizationRNAVerified = r.organizationRNAVerified;
        mission.organizationSirenVerified = r.organizationSirenVerified;
        mission.organizationSiretVerified = r.organizationSiretVerified;
        mission.organizationAddressVerified = r.organizationAddressVerified;
        mission.organizationCityVerified = r.organizationCityVerified;
        mission.organizationPostalCodeVerified = r.organizationPostalCodeVerified;
        mission.organizationDepartmentCodeVerified = r.organizationDepartmentCodeVerified;
        mission.organizationDepartmentNameVerified = r.organizationDepartmentNameVerified;
        mission.organizationRegionVerified = r.organizationRegionVerified;
        mission.organizationVerificationStatus = r.organizationVerificationStatus;
      } else {
        console.log(`[Organization Warning] Could not find mission for clientId: ${r.clientId}`);
      }
    });

    // BULK WRITE
    await bulkDB(missions, publisher, obj);

    // STATS
    obj.missionCount = await MissionModel.countDocuments({ publisherId: publisher._id, deletedAt: null });
    obj.refusedCount = await MissionModel.countDocuments({ publisherId: publisher._id, deletedAt: null, statusCode: "REFUSED" });
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
      if (!publisher.feed) {
        console.log(`[Import XML] Publisher ${publisher.name} has no feed`);
        continue;
      }
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
