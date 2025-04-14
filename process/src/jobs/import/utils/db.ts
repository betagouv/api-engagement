import { Organization, Address as PgAddress, Mission as PgMission, MissionHistory as PgMissionHistory } from "@prisma/client";

import { Mission as MongoMission } from "../../../types";
import prisma from "../../../db/postgres";
import { captureException } from "../../../error";
import { Import, Mission, Publisher } from "../../../types";
import MissionModel from "../../../models/mission";
import { ENVIRONMENT } from "../../../config";

export const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  try {
    await writeMongo(bulk, publisher, importDoc);
    if (ENVIRONMENT === "production") await writePg(publisher, importDoc);
  } catch (error) {
    captureException(`[${publisher.name}] Import failed`, JSON.stringify(error, null, 2));
    return;
  }
};

const writeMongo = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  // We use bulkWriteWithHistory to keep history. See history-plugin.ts.
  // NB: we cast to any to resolve TypeScript error, as bulkWriteWithHistory is added dynamically to the model.
  const mongoBulk = bulk.filter((e) => e).map((e) => (e._id ? { updateOne: { filter: { _id: e._id }, update: { $set: e }, upsert: true } } : { insertOne: { document: e } }));
  const mongoUpdateRes = await (MissionModel as any).withHistoryContext({ reason: `Import XML (${publisher.name})` }).bulkWrite(mongoBulk);

  importDoc.createdCount = mongoUpdateRes.upsertedCount + mongoUpdateRes.insertedCount;
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

const writePg = async (publisher: Publisher, importDoc: Import) => {
  // Write in postgres
  const partner = await prisma.partner.findUnique({ where: { old_id: publisher._id.toString() } });
  if (!partner) {
    captureException(`Partner ${publisher._id.toString()} not found`);
    return;
  }
  const newMongoMissions = await MissionModel.find({ publisherId: publisher._id, createdAt: { $gte: importDoc.startedAt } }).lean();
  console.log(`[${publisher.name}] Postgres ${newMongoMissions.length} missions just created in Mongo`);

  const organizationIds = [] as string[];
  newMongoMissions.forEach((e) => (e && e.organizationId && !organizationIds.includes(e.organizationId) ? organizationIds.push(e.organizationId) : null));
  console.log(`[${publisher.name}] Postgres ${organizationIds.length} organizations to find`);
  const organizations = await prisma.organization.findMany({ where: { old_id: { in: organizationIds } } });
  console.log(`[${publisher.name}] Postgres found ${organizations.length} organizations`);

  const pgCreate = [] as { mission: PgMission; addresses: PgAddress[] }[];
  newMongoMissions.forEach((e) => {
    const res = createDataPg(e as MongoMission, partner.id, organizations);
    if (res) pgCreate.push(res);
  });
  const res = await prisma.mission.createManyAndReturn({ data: pgCreate.map((e) => e.mission), skipDuplicates: true });
  console.log(`[${publisher.name}] Postgres created ${res.length} missions`);

  const pgCreateAddresses = pgCreate
    .map((e) => {
      const mission = res.find((r) => r.old_id === e.mission.old_id);
      if (!mission) return [];
      e.addresses.forEach((a) => {
        a.mission_id = mission.id;
      });
      return e.addresses;
    })
    .flat();
  const resAddresses = await prisma.address.createMany({ data: pgCreateAddresses });
  console.log(`[${publisher.name}] Postgres created ${resAddresses.count} addresses`);

  // TODO: Don't know what i'm doing
  // const pgCreateHistory = pgCreate
  //   .map((e) => {
  //     const mission = res.find((r) => r.old_id === e.mission.old_id);
  //     if (!mission) return [];
  //     e._history.forEach((h) => {
  //       h.mission_id = mission.id;
  //     });
  //     return e._history;
  //   })
  //   .flat();
  // const resHistory = await prisma.mission_history.createMany({ data: pgCreateHistory });
  // console.log(`[${publisher.name}] Postgres created ${resHistory.count} history entries`);

  const upadtedMongoMissions = await MissionModel.find({ publisherId: publisher._id, updatedAt: { $gte: importDoc.startedAt }, createdAt: { $lt: importDoc.startedAt } }).lean();
  console.log(`[${publisher.name}] Postgres ${upadtedMongoMissions.length} missions to update in Mongo`);

  const pgUpdate = upadtedMongoMissions.map((e) => createDataPg(e as MongoMission, partner.id, organizations));
  let updated = 0;
  for (const obj of pgUpdate) {
    try {
      if (updated % 100 === 0) console.log(`[${publisher.name}] Postgres ${updated} missions updated`);
      const mission = await prisma.mission.upsert({
        where: { old_id: obj.mission.old_id },
        update: obj.mission,
        create: obj.mission,
      });
      await prisma.address.deleteMany({ where: { mission_id: mission.id } });
      await prisma.address.createMany({ data: obj.addresses.map((e) => ({ ...e, mission_id: mission.id })) });
      updated += 1;
    } catch (error) {
      console.error(error, obj.mission.old_id);
    }
  }

  console.log(`[${publisher.name}] Postgres ${updated} missions updated`);

  // Clean postgres
  console.log(`[${publisher.name}] Postgres deleting missions...`);
  const pgDeleteRes = await prisma.mission.updateMany({
    where: { updated_at: { lte: importDoc.startedAt }, deleted_at: null, partner_id: partner.id },
    data: { deleted_at: importDoc.startedAt },
  });
  console.log(`[${publisher.name}] Postgres deleted ${pgDeleteRes.count} missions`);
};

const createDataPg = (doc: MongoMission, partnerId: string, organizations: Organization[]): { mission: PgMission; addresses: PgAddress[]; history: PgMissionHistory[] } => {
  const organization = organizations.find((e) => e.old_id === doc.organizationId);
  const obj = {
    old_id: doc._id.toString(),
    title: doc.title,
    client_id: doc.clientId,
    description: doc.description,
    description_html: doc.descriptionHtml,
    tags: doc.tags,
    tasks: doc.tasks,
    domain: doc.domain,
    audience: doc.audience || [],
    soft_skills: doc.soft_skills || [],
    close_to_transport: doc.closeToTransport,
    reduced_mobility_accessible: doc.reducedMobilityAccessible,
    open_to_minors: doc.openToMinors,
    remote: doc.remote,
    schedule: doc.schedule,
    duration: doc.duration,
    posted_at: new Date(doc.postedAt),
    start_at: new Date(doc.startAt),
    end_at: doc.endAt ? new Date(doc.endAt) : null,
    priority: doc.priority,
    places: doc.places,
    metadata: doc.metadata,
    activity: doc.activity,
    type: doc.publisherId === "5f99dbe75eb1ad767733b206" ? "volontariat" : "benevolat",
    snu: doc.snu,
    snu_places: doc.snuPlaces,

    address: doc.address ? doc.address.toString() : "",
    postal_code: doc.postalCode ? doc.postalCode.toString() : "",
    city: doc.city,
    department_name: doc.departmentName,
    department_code: doc.departmentCode ? doc.departmentCode.toString() : "",
    region: doc.region,
    country: doc.country,
    latitude: doc.location?.lat || null,
    longitude: doc.location?.lon || null,
    geoloc_status: doc.geolocStatus,
    organization_url: doc.organizationUrl,
    organization_name: doc.organizationName,
    organization_logo: doc.organizationLogo,
    organization_client_id: doc.organizationId,
    organization_description: doc.organizationDescription,
    organization_rna: doc.organizationRNA,
    organization_siren: doc.organizationSiren,
    organization_full_address: doc.organizationFullAddress,
    organization_city: doc.organizationCity,
    organization_department: doc.organizationDepartment,
    organization_postal_code: doc.organizationPostCode,
    organization_status_juridique: doc.organizationStatusJuridique,
    organization_beneficiaries: doc.organizationBeneficiaries,
    organization_reseaux: doc.organizationReseaux,
    organization_actions: doc.organizationActions || [],
    rna_status: doc.rnaStatus,

    matched_organization_id: organization?.id || null,
    organization_verification_status: doc.organizationVerificationStatus,
    organization_name_verified: doc.organizationNameVerified,
    organization_rna_verified: doc.organizationRNAVerified,
    organization_siren_verified: doc.organizationSirenVerified,
    organization_siret_verified: doc.organizationSiretVerified,
    organization_address_verified: doc.organizationAddressVerified,
    organization_city_verified: doc.organizationCityVerified,
    organization_postal_code_verified: doc.organizationPostalCodeVerified,
    organization_department_code_verified: doc.organizationDepartmentCodeVerified,
    organization_department_name_verified: doc.organizationDepartmentNameVerified,
    organization_region_verified: doc.organizationRegionVerified,
    organization_is_rup: doc.organisationIsRUP,

    is_rna_verified: doc.organizationRNAVerified ? true : false,
    is_siren_verified: doc.organizationSirenVerified ? true : false,
    is_siret_verified: doc.organizationSiretVerified ? true : false,

    partner_id: partnerId,
    last_sync_at: new Date(doc.lastSyncAt || doc.updatedAt),
    status: doc.statusCode,
    status_comment: doc.statusComment,

    jva_moderation_status: doc["moderation_5f5931496c7ea514150a818f_status"],
    jva_moderation_comment: doc["moderation_5f5931496c7ea514150a818f_comment"],
    jva_moderation_title: doc["moderation_5f5931496c7ea514150a818f_title"],
    jva_moderation_updated_at: doc["moderation_5f5931496c7ea514150a818f_date"] ? new Date(doc["moderation_5f5931496c7ea514150a818f_date"]) : undefined,

    leboncoin_moderation_status: doc.leboncoinStatus,
    leboncoin_moderation_comment: doc.leboncoinComment,
    leboncoin_moderation_url: doc.leboncoinUrl,
    leboncoin_moderation_updated_at: doc.leboncoinUpdatedAt ? new Date(doc.leboncoinUpdatedAt) : undefined,

    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
  } as PgMission;

  const addresses: PgAddress[] = doc.addresses.map(
    (address) =>
      ({
        old_id: address._id?.toString() || "",
        street: address.street,
        city: address.city,
        postal_code: address.postalCode,
        department_code: address.departmentCode,
        department_name: address.departmentName,
        region: address.region,
        country: address.country,
        latitude: address.location?.lat || null,
        longitude: address.location?.lon || null,
        geoloc_status: address.geolocStatus,
      }) as PgAddress,
  );

  const history: PgMissionHistory[] = doc.__history?.map((history) => ({
    date: history.date,
    entityId: obj.id,
    state: history.state,
    id: "", // TODO: check if prisma renders uuid when saving
  })) || [];

  return { mission: obj, addresses, history };
};
