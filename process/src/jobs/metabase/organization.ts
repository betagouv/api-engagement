import prisma from "../../db/postgres";
import { captureException } from "../../error";
import { Organization as MongoOrganization } from "../../types";
import { Organization as PgOrganization } from "@prisma/client";
import OrganizationModel from "../../models/organization";

const BULK_SIZE = 5000;

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
    short_title: doc.titleSlug,
    title_slug: doc.shortTitleSlug,
    short_title_slug: doc.shortTitleSlug,
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
    let created = 0;
    let updated = 0;
    let offset = 0;

    const count = await prisma.organization.count();
    console.log(`[Organization] Found ${count} docs in database.`);

    const countToSync = await OrganizationModel.countDocuments({});
    console.log(`[Organization] Found ${countToSync} docs to sync.`);

    while (true) {
      const data = await OrganizationModel.find({}).select("_id updatedAt").limit(BULK_SIZE).skip(offset).lean();
      if (data.length === 0) break;

      const dataToCreate = [] as PgOrganization[];
      const dataToUpdate = [] as PgOrganization[];
      console.log(`[Organization] Processing ${data.length} docs.`);

      // Fetch all existing Orga in one go
      const stored = {} as { [key: string]: Date };
      await prisma.organization
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, updated_at: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d.updated_at)));

      for (const hit of data) {
        if (!stored[hit._id.toString()]) {
          const doc = await OrganizationModel.findById(hit._id);
          if (!doc) continue;
          const obj = buildData(doc);
          if (!obj) continue;
          dataToCreate.push(obj);
        } else if (!isDateEqual(stored[hit._id.toString()], hit.updatedAt)) {
          const doc = await OrganizationModel.findById(hit._id);
          if (!doc) continue;
          const obj = buildData(doc);
          if (!obj) continue;
          dataToUpdate.push(obj);
        }
      }

      console.log(`[Organization] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.organization.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Organization] Created ${res.count} docs, ${created} created so far.`);
      }
      // Update data
      if (dataToUpdate.length) {
        const transactions = [];
        for (const obj of dataToUpdate) {
          transactions.push(prisma.organization.update({ where: { old_id: obj.old_id }, data: obj }));
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prisma.$transaction(transactions.slice(i, i + 100));
        }

        updated += dataToUpdate.length;
        console.log(`[Organization] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);
      }
      offset += BULK_SIZE;
    }

    console.log(`[Organization] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Organization] Error while syncing docs.");
  }
};

export default handler;
