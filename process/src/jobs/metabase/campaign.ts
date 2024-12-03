import prisma from "../../db/postgres";
import CampaignModel from "../../models/campaign";
import { captureException } from "../../error";
import { Campaign } from "../../types";
import { PgCampaign } from "../../types/postgres";

const buildData = (doc: Campaign, partners: { [key: string]: string }) => {
  const annonceurId = partners[doc.fromPublisherId?.toString()];
  if (!annonceurId) {
    console.log(`[Campaigns] Annonceur ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const diffuseurId = partners[doc.toPublisherId?.toString()];
  if (!diffuseurId) {
    console.log(`[Campaigns] Diffuseur ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }

  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    url: doc.url,
    active: doc.active,
    annonceur_id: annonceurId,
    diffuseur_id: diffuseurId,
    reassigned_at: doc.reassignedAt,
    reassigned_by_user_id: doc.reassignedByUserId,
    reassigned_by_user_name: doc.reassignedByUsername,
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  } as PgCampaign;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Campaigns] Starting at ${start.toISOString()}`);

    const data = await CampaignModel.find().lean();
    console.log(`[Campaigns] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { old_id: string; updated_at: Date } };
    await prisma.campaign.findMany({ select: { old_id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Campaigns] Found ${Object.keys(stored).length} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const dataToCreate = [];
    const dataToUpdate = [];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc, partners);
      if (!obj) continue;

      if (exists && new Date(exists.updated_at).getTime() !== obj.updated_at.getTime()) dataToUpdate.push(obj);
      else if (!exists) dataToCreate.push(obj);
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Campaigns] Creating ${dataToCreate.length} docs...`);
      const res = await prisma.campaign.createMany({ data: dataToCreate, skipDuplicates: true });
      console.log(`[Campaigns] Created ${res.count} docs.`);
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Campaigns] Updating ${dataToUpdate.length} docs...`);
      const transactions = [];
      for (const obj of dataToUpdate) {
        transactions.push(prisma.campaign.update({ where: { old_id: obj.old_id }, data: obj }));
      }
      await prisma.$transaction(transactions);
      console.log(`[Campaigns] Updated ${dataToUpdate.length} docs.`);
    }

    console.log(`[Campaigns] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Campaigns] Error while syncing docs.");
  }
};

export default handler;
