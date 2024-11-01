import esClient from "../../db/elastic";
import prisma from "../../db/postgres";

import { STATS_INDEX } from "../../config";
import { captureException } from "../../error";
import { Stats } from "../../types";
import { PgAccount } from "../../types/postgres";

const BATCH_SIZE = 5000;

const buildData = (
  doc: Stats,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string },
  clicks: { [key: string]: string },
) => {
  const partnerFromId = partners[doc.fromPublisherId?.toString()];
  if (!partnerFromId) {
    console.log(`[Accounts] Partner ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const partnerToId = partners[doc.toPublisherId?.toString()];
  if (!partnerToId) {
    console.log(`[Accounts] Partner ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  let missionId;
  if (doc.missionId) {
    missionId = missions[doc.missionId?.toString()];
    if (!missionId) {
      console.log(`[Accounts] Mission ${doc.missionId?.toString()} not found for doc ${doc._id.toString()}`);
      return null;
    }
  }

  let clickId;
  if (doc.clickId) {
    clickId = clicks[doc.clickId];
    if (!clickId) {
      console.log(`[Accounts] Click ${doc.clickId} not found for doc ${doc._id.toString()}`);
    }
  }

  let sourceId;
  if (doc.source === "widget") {
    const widget = widgets[doc.sourceId];
    if (widget) sourceId = widget;
  } else if (doc.source === "campaign") {
    const campaign = campaigns[doc.sourceId];
    if (campaign) sourceId = campaign;
  } else if (doc.source === "publisher") {
    const publisher = partners[doc.sourceId];
    if (publisher) sourceId = publisher;
  }

  const obj = {
    old_id: doc._id,
    old_view_id: doc.clickId,
    mission_id: missionId ? missionId : null,
    created_at: new Date(doc.createdAt),
    host: doc.host,
    tag: doc.tag,
    source: !doc.source || doc.source === "publisher" ? "api" : doc.source,
    source_id: sourceId ? sourceId : null,
    click_id: clickId ? clickId : null,
    campaign_id: sourceId && doc.source === "campaign" ? sourceId : null,
    widget_id: sourceId && doc.source === "widget" ? sourceId : null,
    to_partner_id: partnerToId,
    from_partner_id: partnerFromId,
  } as PgAccount;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Accounts] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId = null;

    const stored = await prisma.apply.count();
    console.log(`[Accounts] Found ${stored} docs in database.`);
    // Select clicks from the last 2 months
    const whereClicks = { created_at: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62), lte: new Date() } };
    const clicks = {} as { [key: string]: string };
    await prisma.click.findMany({ where: whereClicks, select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (clicks[d.old_id] = d.id)));
    const missions = {} as { [key: string]: string };
    await prisma.mission.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (missions[d.old_id] = d.id)));
    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    const campaigns = {} as { [key: string]: string };
    await prisma.campaign.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (campaigns[d.old_id] = d.id)));
    const widgets = {} as { [key: string]: string };
    await prisma.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

    while (true) {
      let data = [];

      if (scrollId) {
        const { body } = await esClient.scroll({
          scroll: "20m",
          scroll_id: scrollId,
        });
        data = body.hits.hits;
      } else {
        const { body } = await esClient.search({
          index: STATS_INDEX,
          scroll: "20m",
          size: BATCH_SIZE,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      "type.keyword": "account",
                    },
                  },
                  {
                    range: {
                      createdAt: {
                        gte: "now-7d/d",
                        lte: "now/d",
                      },
                    },
                  },
                ],
              },
            },
          },
          track_total_hits: true,
        });
        scrollId = body._scroll_id;
        data = body.hits.hits as { _id: string; _source: Stats }[];
        console.log(`[Accounts] Total hits ${body.hits.total.value}, scrollId ${scrollId}`);
      }

      if (data.length === 0) {
        break;
      }

      const dataToCreate = [];
      for (const hit of data) {
        const obj = buildData({ _id: hit._id, ...hit._source }, partners, missions, clicks, campaigns, widgets);
        if (!obj) continue;

        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.account.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Accounts] Created ${res.count} docs, ${created} created so far.`);
      }
    }

    console.log(`[Accounts] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
  } catch (error) {
    captureException(error, "[Accounts] Error while syncing docs.");
  }
};

export default handler;
