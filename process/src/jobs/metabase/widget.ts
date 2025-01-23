import prisma from "../../db/postgres";
import WidgetModel from "../../models/widget";
import { captureException } from "../../error";
import { Widget } from "../../types";
import { Widget as PgWidget } from "@prisma/client";

interface WidgetUpdate extends PgWidget {
  partners: { create: { partner_id: string }[] };
}

const buildData = (doc: Widget, partners: { id: string; old_id: string }[]) => {
  const annonceurs = partners.filter((p) => doc.publishers.includes(p.old_id));
  const diffuseur = partners.find((p) => p.old_id === doc.fromPublisherId.toString());
  if (!diffuseur) {
    console.log(`[Widgets] Diffuseur ${doc.fromPublisherId.toString()} not found for widget ${doc._id.toString()}`);
    return null;
  }
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    mission_type: doc.type,
    active: doc.active,
    partners: {
      create: annonceurs.map((a) => ({ partner_id: a.id })),
    },
    diffuseur_id: diffuseur.id,
    deleted_at: doc.deleted ? new Date(doc.updatedAt) : null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  } as WidgetUpdate;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Widgets] Starting at ${start.toISOString()}`);

    const data = await WidgetModel.find().lean();
    console.log(`[Widgets] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { old_id: string; updated_at: Date } };
    await prisma.widget.findMany({ select: { old_id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Widgets] Found ${Object.keys(stored).length} docs in database.`);

    const partners = await prisma.partner.findMany({ select: { id: true, old_id: true } });

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
      console.log(`[Widgets] Creating ${dataToCreate.length} docs...`);
      const transactions = [];
      for (const obj of dataToCreate) {
        const { partners, ...widgetData } = obj;
        transactions.push(
          prisma.widget.create({
            data: {
              ...widgetData,
              partners: partners,
            },
          }),
        );
      }
      const res = await prisma.$transaction(transactions);
      console.log(`[Widgets] Created ${res.length} docs.`);
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Widgets] Updating ${dataToUpdate.length} docs...`);
      const transactions = [];
      for (const obj of dataToUpdate) {
        const { partners, ...widgetData } = obj;
        transactions.push(
          prisma.widget.update({
            where: { old_id: obj.old_id },
            data: {
              ...widgetData,
              partners: partners,
            },
          }),
        );
      }
      const res = await prisma.$transaction(transactions);
      console.log(`[Widgets] Updated ${res.length} docs.`);
    }

    console.log(`[Widgets] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Widgets] Error while syncing docs.");
  }
};

export default handler;
