import { WidgetQuery as PgWidgetQuery } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import RequestWidgetModel from "../../../models/request-widget";
import { RequestWidget } from "../../../types";

const BATCH_SIZE = 5000;

function sanitizeRemoteValue(value: string): string {
  if (!value) {
    return "";
  }

  return (
    value
      // Remove control characters and zero-width characters
      .replace(/[\x00-\x1F\x7F-\x9F\uFEFF\uFFFE\uFFFF]/g, "")
      // Remove potentially dangerous characters
      .replace(/[\\'"();|[\]{}]/g, "")
      // Keep only printable characters and common emojis
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Emoji}\s-]/gu, "")
      // Trim whitespace
      .trim()
  );
}

const toArray = (value: string | string[] | undefined) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeRemoteValue);
  }
  return [sanitizeRemoteValue(value)];
};

const buildData = (doc: RequestWidget, widgets: { [key: string]: string }) => {
  const widgetId = widgets[doc.widgetId.toString()];
  if (!widgetId) {
    console.log(`[Widget-Requests] Widget ${doc.widgetId.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const obj = {
    old_id: doc._id.toString(),
    domain: toArray(doc.query?.domain),
    organization: toArray(doc.query?.organization),
    department: toArray(doc.query?.department),
    schedule: toArray(doc.query?.schedule),
    remote: toArray(doc.query?.remote),
    action: toArray(doc.query?.action),
    beneficiary: toArray(doc.query?.beneficiary),
    country: toArray(doc.query?.country),
    minor: toArray(doc.query?.minor),
    accessibility: toArray(doc.query?.accessibility),
    duration: doc.query?.duration ? parseInt(doc.query.duration) : null,
    start: doc.query?.start ? new Date(doc.query.start) : null,
    search: doc.query?.search ?? null,
    lat: doc.query?.lat ? parseFloat(doc.query.lat) : null,
    lon: doc.query?.lon ? parseFloat(doc.query.lon) : null,
    size: doc.query?.size ? parseInt(doc.query.size, 10) : null,
    from: doc.query?.from ? parseInt(doc.query.from, 10) : null,
    city: doc.query?.city ?? null,
    distance: doc.query?.distance ?? null,
    jva_moderation: doc.query?.jvaModeration ?? null,
    created_at: new Date(doc.createdAt),
    widget_id: widgetId,
  } as PgWidgetQuery;
  return obj;
};

const handler = async () => {
  let created = 0;
  let offset = 20000;
  let processed = 0;
  try {
    const start = new Date();
    console.log(`[Widget-Requests] Started at ${start.toISOString()}.`);

    const count = await prismaClient.widgetQuery.count();
    console.log(`[Widget-Requests] Found ${count} docs in database.`);

    const widgets = {} as { [key: string]: string };
    await prismaClient.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

    // Get data from 2 weeks ago
    const where = { createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } };
    const countToSync = await RequestWidgetModel.countDocuments(where);
    console.log(`[Widget-Requests] Found ${countToSync} docs to sync.`);

    while (true) {
      const data = await RequestWidgetModel.find(where).limit(BATCH_SIZE).skip(offset).lean();

      if (data.length === 0) {
        break;
      }

      console.log(`[Widget-Requests] Processing ${data.length} docs.`);

      const dataToCreate: PgWidgetQuery[] = [];

      const stored = {} as { [key: string]: boolean };
      await prismaClient.widgetQuery
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = true)));

      for (const doc of data) {
        if (stored[doc._id.toString()]) {
          continue;
        }
        const obj = buildData(doc as RequestWidget, widgets);
        if (!obj) {
          continue;
        }

        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        console.log(`[Widget-Requests] Creating ${dataToCreate.length} docs...`);
        try {
          const res = await prismaClient.widgetQuery.createMany({
            data: dataToCreate,
            skipDuplicates: true,
          });
          created += res.count;
          console.log(`[Widget-Requests] Created ${res.count} docs.`);
        } catch (error) {
          captureException(error, { extra: { dataToCreate } });
        }
      }

      processed += data.length;
      offset += BATCH_SIZE;
    }

    console.log(`[Widget-Requests] Processed ${processed} docs, ${created} created`);
    console.log(`[Widget-Requests] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, { extra: { offset, processed, created } });
  }
};

export default handler;
