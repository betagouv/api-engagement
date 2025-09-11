import { Organization as PgOrganization } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import OrganizationModel from "../../../models/organization";
import { Organization as MongoOrganization } from "../../../types";
import { slugify } from "../../../utils";

const BULK_SIZE = 10000;

const buildData = (doc: MongoOrganization) => {
  const obj = {
    old_id: doc._id.toString(),
    rna: doc.rna,
    siren: doc.siren || doc.siret?.slice(0, 9),
    siret: doc.siret,
    rup_mi: doc.rupMi,
    gestion: doc.gestion,
    status: doc.status,
    created_at: doc.createdAt,
    last_declared_at: doc.lastDeclaredAt,
    published_at: doc.publishedAt,
    dissolved_at: doc.dissolvedAt,
    updated_at: doc.updatedAt,
    nature: doc.nature,
    groupement: doc.groupement,
    title: doc.title,
    short_title: doc.shortTitle,
    title_slug: doc.titleSlug || slugify(doc.title),
    short_title_slug: doc.shortTitleSlug || (doc.shortTitle ? slugify(doc.shortTitle) : null),
    names: doc.names,
    object: doc.object,
    social_object1: doc.socialObject1,
    social_object2: doc.socialObject2,
    address_complement: doc.addressComplement,
    address_number: doc.addressNumber,
    address_repetition: doc.addressRepetition,
    address_type: doc.addressType,
    address_street: doc.addressStreet,
    address_distribution: doc.addressDistribution,
    address_insee_code: doc.addressInseeCode,
    address_postal_code: doc.addressPostalCode,
    address_department_code: doc.addressDepartmentCode,
    address_department_name: doc.addressDepartmentName,
    address_region: doc.addressRegion,
    address_city: doc.addressCity,
    management_declarant: doc.managementDeclarant,
    management_complement: doc.managementComplement,
    management_street: doc.managementStreet,
    management_distribution: doc.managementDistribution,
    management_postal_code: doc.managementPostalCode,
    management_city: doc.managementCity,
    management_country: doc.managementCountry,
    director_civility: doc.directorCivility,
    website: doc.website,
    observation: doc.observation,
    sync_at: doc.syncAt,
    source: doc.source,
  } as PgOrganization;
  return obj;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Organization] Started at ${start.toISOString()}.`);
    let processed = 0;
    let created = 0;
    let updated = 0;

    const count = await prismaClient.organization.count();
    console.log(`[Organization] Found ${count} docs in database.`);

    const where = { $or: [{ lastExportedToPgAt: null }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }] };
    const countToSync = await OrganizationModel.countDocuments(where);
    console.log(`[Organization] Found ${countToSync} docs to sync.`);

    while (true) {
      const start = new Date();
      console.log(`[Organization] Fetching docs from ${start.toISOString()}`);
      const data = await OrganizationModel.find(where).select("_id updatedAt").limit(BULK_SIZE).lean();
      console.log(`[Organization] Fetched ${data.length} docs in ${(new Date().getTime() - start.getTime()) / 1000}s.`);
      if (data.length === 0) {
        break;
      }
      processed += data.length;

      const dataToCreate = [] as PgOrganization[];
      const dataToUpdate = [] as PgOrganization[];
      console.log(`[Organization] Processing ${data.length} docs, ${processed} processed so far`);

      // Fetch all existing Orga in one go
      const stored = {} as { [key: string]: Date };

      await prismaClient.organization
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, updated_at: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d.updated_at)));

      for (const hit of data) {
        if (!stored[hit._id.toString()]) {
          const doc = await OrganizationModel.findById(hit._id);
          if (!doc) {
            continue;
          }
          const obj = buildData(doc);
          if (!obj) {
            continue;
          }
          dataToCreate.push(obj);
        } else if (!isDateEqual(stored[hit._id.toString()], hit.updatedAt)) {
          const doc = await OrganizationModel.findById(hit._id);
          if (!doc) {
            continue;
          }
          const obj = buildData(doc);
          if (!obj) {
            continue;
          }
          dataToUpdate.push(obj);
        }
      }
      console.log(`[Organization] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update`);

      // Create data
      if (dataToCreate.length) {
        const res = await prismaClient.organization.createMany({
          data: dataToCreate,
          skipDuplicates: true,
        });
        created += res.count;
        console.log(`[Organization] Created ${res.count} docs, ${created} created so far.`);
      }
      // Update data
      if (dataToUpdate.length) {
        const transactions = [];
        for (const obj of dataToUpdate) {
          transactions.push(prismaClient.organization.update({ where: { old_id: obj.old_id }, data: obj }));
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prismaClient.$transaction(transactions.slice(i, i + 100));
        }

        updated += dataToUpdate.length;
        console.log(`[Organization] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);
      }

      // Update lastExportedToPgAt
      console.log(`[Organization] Updating lastExportedToPgAt for ${data.length} docs, processed batch in ${(new Date().getTime() - start.getTime()) / 1000}s.`);
      await OrganizationModel.updateMany({ _id: { $in: data.map((hit) => hit._id) } }, { $set: { lastExportedToPgAt: new Date() } }, { timestamps: false });
    }

    console.log(`[Organization] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Organization] Error while syncing docs.");
  }
};

export default handler;
