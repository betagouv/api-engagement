import { Campaign as PrismaCampaign } from "@prisma/client";
import prisma from "../../db/postgres";
import { captureException } from "../../error";
import CampaignModel from "../../models/campaign";
import { Campaign } from "../../types";

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

  const campaign = {
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
  } as PrismaCampaign;

  const trackers = doc.trackers.map((t) => ({
    key: t.key,
    value: t.value,
  }));

  return { campaign, trackers };
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Campaigns] Starting at ${start.toISOString()}`);

    const data = await CampaignModel.find().lean();
    console.log(`[Campaigns] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { id: string; old_id: string; updated_at: Date } };
    await prisma.campaign.findMany({ select: { old_id: true, updated_at: true, id: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Campaigns] Found ${Object.keys(stored).length} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const dataToCreate = [];
    const dataToUpdate = [];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as Campaign, partners);
      if (!obj) {
        continue;
      }

      if (!exists) {
        dataToCreate.push(obj);
        continue;
      }
      dataToUpdate.push({ ...obj, id: exists.id });
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Campaigns] Creating ${dataToCreate.length} docs...`);
      const res = await prisma.campaign.createManyAndReturn({ data: dataToCreate.map((d) => d.campaign), skipDuplicates: true });
      console.log(`[Campaigns] Created ${res.length} docs.`);
      for (const obj of dataToCreate) {
        const campaign = res.find((r) => r.old_id === obj.campaign.old_id);
        if (!campaign) {
          console.log(`[Campaigns] Campaign ${obj.campaign.old_id} not found after creation`);
          continue;
        }
        await prisma.campaignTracker.createMany({ data: obj.trackers.map((t) => ({ ...t, campaign_id: campaign.id })), skipDuplicates: true });
      }
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Campaigns] Updating ${dataToUpdate.length} docs...`);
      let updated = 0;
      for (const obj of dataToUpdate) {
        await prisma.campaign.update({ where: { id: obj.id }, data: obj.campaign });
        await prisma.campaignTracker.deleteMany({ where: { campaign_id: obj.id } });
        await prisma.campaignTracker.createMany({ data: obj.trackers.map((t) => ({ ...t, campaign_id: obj.id })), skipDuplicates: true });
        updated++;
      }
      console.log(`[Campaigns] Updated ${updated} docs.`);
    }

    console.log(`[Campaigns] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Campaigns] Error while syncing docs.");
  }
};

export default handler;
