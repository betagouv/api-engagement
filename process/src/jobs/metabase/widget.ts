import prisma from "../../db/postgres";
import WidgetModel from "../../models/widget";
import { captureException } from "../../error";
import { Widget } from "../../types";
import { Widget as PgWidget } from "@prisma/client";

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

    color: doc.color,
    style: doc.style,
    city: doc.location?.city || null,
    postal_code: doc.location?.postcode || null,
    latitude: doc.location?.lat || null,
    longitude: doc.location?.lon || null,
    distance: doc.location ? doc.distance : null,
    jva_moderation: doc.jvaModeration,

    diffuseur_id: diffuseur.id,
    deleted_at: doc.deleted ? new Date(doc.updatedAt) : null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  } as PgWidget;

  return { widget: obj, partners: annonceurs.map((a) => ({ partner_id: a.id })) };
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

    const dataToCreate = [] as { widget: PgWidget; partners: { partner_id: string }[] }[];
    const dataToUpdate = [] as { widget: PgWidget; partners: { partner_id: string }[] }[];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as Widget, partners);
      if (!obj) continue;
      // if (exists && new Date(exists.updated_at).getTime() !== obj.widget.updated_at.getTime()) dataToUpdate.push(obj);
      if (!exists) dataToCreate.push(obj);
      else dataToUpdate.push(obj);
    }
    console.log(`[Widgets] Found ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

    // Create data
    if (dataToCreate.length) {
      console.log(`[Widgets] Creating ${dataToCreate.length} docs...`);
      for (const obj of dataToCreate) {
        const { partners, widget } = obj;
        await prisma.widget.create({
          data: {
            ...widget,
            partners: { create: partners },
          },
        });
      }
      console.log(`[Widgets] Created ${dataToCreate.length} docs.`);
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Widgets] Updating ${dataToUpdate.length} docs...`);
      for (const obj of dataToUpdate) {
        const { partners, widget } = obj;

        const res = await prisma.widget.upsert({
          where: { old_id: obj.widget.old_id },
          update: obj.widget,
          create: obj.widget,
        });
        await prisma.partnerToWidget.deleteMany({ where: { widget_id: res.id } });
        await prisma.partnerToWidget.createMany({ data: partners.map((p) => ({ ...p, widget_id: res.id })) });
      }
      console.log(`[Widgets] Updated ${dataToUpdate.length} docs.`);
    }

    console.log(`[Widgets] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Widgets] Error while syncing docs.");
  }
};

export default handler;
