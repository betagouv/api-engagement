import prisma from "../../db/postgres";
import PublisherModel from "../../models/publisher";
import { captureException } from "../../error";
import { Publisher } from "../../types";
import { PgPartner } from "../../types/postgres";

const buildData = (doc: Publisher) => {
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    diffuseur_api: doc.role_annonceur_api,
    diffuseur_widget: doc.role_annonceur_campagne,
    diffuseur_campaign: doc.role_annonceur_widget,
    annonceur: doc.role_promoteur,
    partners: doc.publishers.map((p) => p.publisher),
    created_at: new Date(doc.created_at),
    updated_at: new Date(doc.updated_at),
    deleted_at: doc.deleted_at ? new Date(doc.deleted_at) : null,
  } as PgPartner;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Partners] Starting at ${start.toISOString()}`);

    const data = await PublisherModel.find().lean();
    console.log(`[Partners] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { old_id: string; updated_at: Date } };
    await prisma.partner.findMany({ select: { old_id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Partners] Found ${Object.keys(stored).length} docs in database.`);

    const dataToCreate = [] as PgPartner[];
    const dataToUpdate = [] as PgPartner[];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc);
      if (exists && new Date(exists.updated_at).getTime() !== obj.updated_at.getTime()) dataToUpdate.push(obj);
      else if (!exists) dataToCreate.push(obj);
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Partners] Creating ${dataToCreate.length} docs...`);
      const res = await prisma.partner.createMany({ data: dataToCreate, skipDuplicates: true });
      console.log(`[Partners] Created ${res.count} docs.`);
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Partners] Updating ${dataToUpdate.length} docs...`);
      const transactions = [];
      for (const obj of dataToUpdate) {
        transactions.push(prisma.partner.update({ where: { old_id: obj.old_id }, data: obj }));
      }
      await prisma.$transaction(transactions);
      console.log(`[Partners] Updated ${dataToUpdate.length} docs.`);
    }

    console.log(`[Partners] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
