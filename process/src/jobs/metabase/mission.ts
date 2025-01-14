import prisma from "../../db/postgres";
import { captureException } from "../../error";
import { Mission as MongoMission } from "../../types";
import { Mission as PgMission } from "@prisma/client";
import MissionModel from "../../models/mission";

const BULK_SIZE = 5000;

const buildData = async (doc: MongoMission, partners: { [key: string]: string }) => {
  const partnerId = partners[doc.publisherId?.toString()];
  if (!partnerId) {
    console.log(`[Mission] Partner ${doc.publisherId?.toString()} not found for mission ${doc._id?.toString()}`);
    return null;
  }

  const organization = doc.organizationId ? await prisma.organization.findUnique({ where: { id: doc.organizationId } }) : null;

  const obj = {
    old_id: doc._id?.toString(),

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

    // organization_id: doc.organizationId,
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

    organization_id: organization?.id,
    rna_status: doc.rnaStatus,

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

  return obj;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Missions] Started at ${start.toISOString()}.`);
    let created = 0;
    let updated = 0;
    let offset = 0;

    const count = await prisma.mission.count();
    console.log(`[Missions] Found ${count} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const where = { $or: [{ createdAt: { $gte: fourteenDaysAgo } }, { updatedAt: { $gte: fourteenDaysAgo } }] };
    const countToSync = await MissionModel.countDocuments(where);
    console.log(`[Missions] Found ${countToSync} docs to sync.`);

    while (true) {
      const data = await MissionModel.find(where).limit(BULK_SIZE).skip(offset).lean();
      if (data.length === 0) break;

      const dataToCreate = [] as PgMission[];
      const dataToUpdate = [] as PgMission[];
      console.log(`[Missions] Processing ${data.length} docs.`);

      // Fetch all existing missions in one go
      const stored = {} as { [key: string]: { updated_at: Date } };
      await prisma.mission
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, updated_at: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d)));

      for (const hit of data) {
        const obj = buildData(hit, partners);
        if (!obj) continue;

        if (stored[hit._id.toString()] && !isDateEqual(stored[hit._id.toString()].updated_at, obj.updated_at)) dataToUpdate.push(obj);
        else if (!stored[hit._id.toString()]) dataToCreate.push(obj);
      }

      console.log(`[Missions] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.mission.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Missions] Created ${res.count} docs, ${created} created so far.`);
      }
      // Update data
      if (dataToUpdate.length) {
        const transactions = [];
        for (const obj of dataToUpdate) {
          transactions.push(prisma.mission.update({ where: { old_id: obj.old_id }, data: obj }));
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prisma.$transaction(transactions.slice(i, i + 100));
        }

        updated += dataToUpdate.length;
        console.log(`[Missions] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);
      }
      offset += BULK_SIZE;
    }

    console.log(`[Missions] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Missions] Error while syncing docs.");
  }
};

export default handler;
