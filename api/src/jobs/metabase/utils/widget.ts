import { Widget as PgWidget } from "@prisma/client";
import prisma from "../../../db/postgres";
import { captureException, captureMessage } from "../../../error";
import WidgetModel from "../../../models/widget";
import { Widget } from "../../../types";

const buildData = (doc: Widget, partners: { [key: string]: string }) => {
  const diffuseurId = partners[doc.fromPublisherId?.toString()];
  if (!diffuseurId) {
    captureMessage(`[Widgets] Diffuseur ${doc.fromPublisherId.toString()} not found for widget ${doc._id.toString()}`);
    return null;
  }
  const annonceurIds = doc.publishers.map((p) => partners[p.toString()]);
  if (annonceurIds.some((id) => !id)) {
    const missing = doc.publishers.filter((p) => !partners[p.toString()]);
    captureMessage(`[Widgets] Annonceur ${missing.join(", ")} not found for widget ${doc._id.toString()}`);
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
    jva_moderation: doc.jvaModeration || false,

    diffuseur_id: diffuseurId,
    deleted_at: doc.deletedAt || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  } as PgWidget;

  return { widget: obj, partners: Array.from(new Set(annonceurIds.filter((a) => a !== undefined))) };
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Widgets] Starting at ${start.toISOString()}`);

    const data = await WidgetModel.find().lean();
    console.log(`[Widgets] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { old_id: string; id: string } };
    await prisma.widget.findMany({ select: { old_id: true, id: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Widgets] Found ${Object.keys(stored).length} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const dataToCreate = [] as { widget: PgWidget; partners: string[] }[];
    const dataToUpdate = [] as { widget: PgWidget; partners: string[]; id: string }[];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as Widget, partners);
      if (!obj) {
        continue;
      }
      if (!exists) {
        dataToCreate.push(obj);
        continue;
      }
      dataToUpdate.push({ ...obj, id: exists.id });
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
            partners: { create: partners.map((p) => ({ partner_id: p })) },
          },
        });
      }
      console.log(`[Widgets] Created ${dataToCreate.length} docs.`);
    }
    // Update data
    if (dataToUpdate.length) {
      console.log(`[Widgets] Updating ${dataToUpdate.length} docs...`);
      for (const obj of dataToUpdate) {
        const { partners, widget, id } = obj;

        await prisma.widget.update({ where: { id }, data: widget });
        await prisma.partnerToWidget.deleteMany({ where: { widget_id: id } });
        await prisma.partnerToWidget.createMany({ data: partners.map((p) => ({ partner_id: p, widget_id: id })) });
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
