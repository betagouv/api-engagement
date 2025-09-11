import { Partner as PgPartner } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import PublisherModel from "../../../models/publisher";
import { Publisher } from "../../../types";

const buildData = (doc: Publisher) => {
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    diffuseur_api: doc.hasApiRights,
    diffuseur_widget: doc.hasWidgetRights,
    diffuseur_campaign: doc.hasCampaignRights,
    annonceur: doc.isAnnonceur,
    partners: doc.publishers.map((p) => p.publisherId).filter((p) => p !== undefined),
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

    const stored = {} as { [key: string]: { old_id: string; id: string; updated_at: Date } };
    await prismaClient.partner.findMany({ select: { old_id: true, id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Partners] Found ${Object.keys(stored).length} docs in database.`);

    let created = 0;
    let updated = 0;
    let processed = 0;

    for (const doc of data) {
      if (processed % 10 === 0) {
        console.log(`[Partners] Processed ${processed}/${data.length} docs, created ${created}, updated ${updated}`);
      }

      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as Publisher);
      if (!exists) {
        await prismaClient.partner.create({ data: obj });
        created++;
      } else if (!isDateEqual(exists.updated_at, obj.updated_at)) {
        await prismaClient.partner.update({ where: { old_id: obj.old_id }, data: obj });
        updated++;
      }
      processed++;
    }

    console.log(`[Partners] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s, created ${created}, updated ${updated}, processed ${processed}`);
    return { created, updated, processed };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
