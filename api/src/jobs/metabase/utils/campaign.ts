import { Campaign as PrismaCampaign } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException, captureMessage } from "../../../error";
import CampaignModel from "../../../models/campaign";
import { Campaign } from "../../../types";

const buildData = (doc: Campaign, partners: { [key: string]: string }) => {
  const diffuseurId = partners[doc.fromPublisherId?.toString()];
  if (!diffuseurId) {
    captureMessage(`[Campaigns] Diffuseur ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const annonceurId = partners[doc.toPublisherId?.toString()];
  if (!annonceurId) {
    captureMessage(`[Campaigns] Annonceur ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
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

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Campaigns] Starting at ${start.toISOString()}`);

    const data = await CampaignModel.find().lean();
    console.log(`[Campaigns] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { id: string; old_id: string; updated_at: Date } };
    await prismaClient.campaign.findMany({ select: { old_id: true, id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Campaigns] Found ${Object.keys(stored).length} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

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
      if (!isDateEqual(exists.updated_at, obj.campaign.updated_at)) {
        dataToUpdate.push({ ...obj, id: exists.id });
      }
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Campaigns] Creating ${dataToCreate.length} docs...`);
      for (const obj of dataToCreate) {
        const { campaign, trackers } = obj;
        try {
          await prismaClient.campaign.create({
            data: {
              ...campaign,
              trackers: { create: trackers },
            },
          });
        } catch (error) {
          captureException(error, { extra: { campaign, trackers } });
        }
      }
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Campaigns] Updating ${dataToUpdate.length} docs...`);
      let updated = 0;
      for (const obj of dataToUpdate) {
        const { id, campaign, trackers } = obj;
        try {
          await prismaClient.campaign.update({ where: { id }, data: campaign });
          await prismaClient.campaignTracker.deleteMany({ where: { campaign_id: id } });
          await prismaClient.campaignTracker.createMany({ data: trackers.map((t) => ({ ...t, campaign_id: id })), skipDuplicates: true });
        } catch (error) {
          captureException(error, { extra: { campaign, trackers, id } });
        }
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
