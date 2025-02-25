import prisma from "../../db/postgres";
import RequestWidgetModel from "../../models/request-widget";
import { captureException } from "../../error";
import { RequestWidget } from "../../types";
import { WidgetQuery as PgWidgetQuery } from "@prisma/client";

const BATCH_SIZE = 5000;

const buildData = (doc: RequestWidget, widgets: { [key: string]: string }) => {
  const widgetId = widgets[doc.widgetId.toString()];
  if (!widgetId) {
    console.log(`[Widget-Requests] Widget ${doc.widgetId.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const obj = {
    old_id: doc._id.toString(),
    domain: Array.isArray(doc.query?.domain) ? doc.query.domain : doc.query?.domain ? [doc.query.domain] : [],
    organization: Array.isArray(doc.query?.organization) ? doc.query.organization : doc.query?.organization ? [doc.query.organization] : [],
    department: Array.isArray(doc.query?.department) ? doc.query.department : doc.query?.department ? [doc.query.department] : [],
    schedule: Array.isArray(doc.query?.schedule) ? doc.query.schedule : doc.query?.schedule ? [doc.query.schedule] : [],
    remote: Array.isArray(doc.query?.remote) ? doc.query.remote : doc.query?.remote ? [doc.query.remote] : [],
    action: Array.isArray(doc.query?.action) ? doc.query.action : doc.query?.action ? [doc.query.action] : [],
    beneficiary: Array.isArray(doc.query?.beneficiary) ? doc.query.beneficiary : doc.query?.beneficiary ? [doc.query.beneficiary] : [],
    country: Array.isArray(doc.query?.country) ? doc.query.country : doc.query?.country ? [doc.query.country] : [],
    minor: Array.isArray(doc.query?.minor) ? doc.query.minor : doc.query?.minor ? [doc.query.minor] : [],
    accessibility: Array.isArray(doc.query?.accessibility) ? doc.query.accessibility : doc.query?.accessibility ? [doc.query.accessibility] : [],
    duration: doc.query?.duration ? parseInt(doc.query.duration) : null,
    start: doc.query?.start ? new Date(doc.query.start) : null,
    search: doc.query?.search ?? null,
    lat: doc.query?.lat ? parseFloat(doc.query.lat) : null,
    lon: doc.query?.lon ? parseFloat(doc.query.lon) : null,
    size: doc.query?.size ? parseInt(doc.query.size, 10) : null,
    from: doc.query?.from ? parseInt(doc.query.from, 10) : null,
    created_at: new Date(doc.createdAt),
    widget_id: widgetId,
  } as PgWidgetQuery;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    let created = 0;
    let page = 0;

    // Get data from 2 weeks ago
    const where = { createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } };
    const total = await RequestWidgetModel.countDocuments(where);
    let data = await RequestWidgetModel.find(where)
      .limit(BATCH_SIZE)
      .skip(page * BATCH_SIZE)
      .lean();
    console.log(`[Widget-Requests] Found ${total} docs to sync.`);

    const stored = await prisma.widgetQuery.count();
    console.log(`[Widget-Requests] Found ${stored} docs in database.`);

    const widgets = {} as { [key: string]: string };
    await prisma.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

    while (data && data.length) {
      const dataToCreate = [];
      for (const doc of data) {
        const obj = buildData(doc as RequestWidget, widgets);
        if (!obj) continue;
        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        console.log(`[Widget-Requests] Creating ${dataToCreate.length} docs...`);
        const res = await prisma.widgetQuery.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Widget-Requests] Created ${res.count} docs.`);
      }

      page++;
      data = await RequestWidgetModel.find(where)
        .limit(BATCH_SIZE)
        .skip(page * BATCH_SIZE)
        .lean();
    }

    console.log(`[Widget-Requests] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Widget-Requests] Error while syncing docs.");
  }
};

export default handler;
