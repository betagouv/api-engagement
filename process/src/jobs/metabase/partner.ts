import prisma from "../../db/postgres";
import PublisherModel from "../../models/publisher";
import { captureException } from "../../error";
import { Publisher } from "../../types";
import { Partner as PgPartner } from "@prisma/client";

const buildData = (doc: Publisher) => {
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    diffuseur_api: doc.api,
    diffuseur_widget: doc.widget,
    diffuseur_campaign: doc.campaign,
    annonceur: doc.annonceur,
    partners: doc.publishers.map((p) => p.publisherId),
    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
  } as PgPartner;
  return obj;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

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
      const obj = buildData(doc as Publisher);
      if (!exists) dataToCreate.push(obj);
      else if (!isDateEqual(exists.updated_at, obj.updated_at)) dataToUpdate.push(obj);
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
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
