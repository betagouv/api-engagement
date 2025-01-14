import prisma from "../../db/postgres";
import { captureException } from "../../error";
import { OrganizationNameMatch as MongoOrganizationNameMatch } from "../../types";
import { OrganizationNameMatch as PgOrganizationNameMatch } from "@prisma/client";
import OrganizationNameMatchModel from "../../models/organization-name-matches";

const BULK_SIZE = 5000;

const buildData = (doc: MongoOrganizationNameMatch) => {
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    organization_ids: doc.organizationIds,
    organization_names: doc.organizationNames,
    mission_ids: doc.missionIds,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  } as PgOrganizationNameMatch;
  return obj;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[OrganizationNameMatch] Started at ${start.toISOString()}.`);
    let created = 0;
    let updated = 0;
    let offset = 0;

    const count = await prisma.organizationNameMatch.count();
    console.log(`[OrganizationNameMatch] Found ${count} docs in database.`);

    const countToSync = await OrganizationNameMatchModel.countDocuments({});
    console.log(`[OrganizationNameMatch] Found ${countToSync} docs to sync.`);

    while (true) {
      const data = await OrganizationNameMatchModel.find({}).select("_id updatedAt").limit(BULK_SIZE).skip(offset).lean();
      if (data.length === 0) break;

      const dataToCreate = [] as PgOrganizationNameMatch[];
      const dataToUpdate = [] as PgOrganizationNameMatch[];
      console.log(`[OrganizationNameMatch] Processing ${data.length} docs.`);

      // Fetch all existing matches in one go
      const stored = {} as { [key: string]: Date };
      await prisma.organizationNameMatch
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, updated_at: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d.updated_at)));

      for (const hit of data) {
        if (!stored[hit._id.toString()]) {
          const doc = await OrganizationNameMatchModel.findById(hit._id);
          if (!doc) continue;
          const obj = buildData(doc);
          if (!obj) continue;
          dataToCreate.push(obj);
        } else if (!isDateEqual(stored[hit._id.toString()], hit.updatedAt)) {
          const doc = await OrganizationNameMatchModel.findById(hit._id);
          if (!doc) continue;
          const obj = buildData(doc);
          if (!obj) continue;
          dataToUpdate.push(obj);
        }
      }

      console.log(`[OrganizationNameMatch] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.organizationNameMatch.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[OrganizationNameMatch] Created ${res.count} docs, ${created} created so far.`);
      }

      // Update data
      if (dataToUpdate.length) {
        const transactions = [];
        for (const obj of dataToUpdate) {
          transactions.push(prisma.organizationNameMatch.update({ where: { old_id: obj.old_id }, data: obj }));
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prisma.$transaction(transactions.slice(i, i + 100));
        }

        updated += dataToUpdate.length;
        console.log(`[OrganizationNameMatch] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);
      }
      offset += BULK_SIZE;
    }

    console.log(`[OrganizationNameMatch] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[OrganizationNameMatch] Error while syncing docs.");
  }
};

export default handler;
