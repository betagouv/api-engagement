import esClient from "../../db/elastic";
import prisma from "../../db/postgres";

import { STATS_INDEX } from "../../config";
import { captureException } from "../../error";
import { Stats } from "../../types";
import { Apply } from "@prisma/client";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: Stats,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string },
  clickId: string | undefined,
) => {
  const partnerFromId = partners[doc.fromPublisherId?.toString()];
  if (!partnerFromId) {
    console.log(`[Applies] Partner ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const partnerToId = partners[doc.toPublisherId?.toString()];
  if (!partnerToId) {
    console.log(`[Applies] Partner ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }

  let missionId;
  if (doc.missionClientId && doc.toPublisherId) {
    missionId = missions[`${doc.missionClientId}-${doc.toPublisherId}`];
    if (!missionId) {
      const m = await prisma.mission.findFirst({ where: { old_id: doc.missionId?.toString() }, select: { id: true } });
      if (m) {
        missionId = m.id;
      } else {
        console.log(`[Applies] Mission ${doc.missionId?.toString()} not found for doc ${doc._id.toString()}`);
      }
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
    mission_old_id: doc.missionId ? doc.missionId : null,
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
  } as Apply;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Applies] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId = null;

    const stored = await prisma.apply.count();
    console.log(`[Applies] Found ${stored} docs in database.`);
    // Select clicks from the last 2 months
    const whereClicks = { created_at: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62) } };
    const clicks = {} as { [key: string]: string };
    await prisma.click.findMany({ where: whereClicks, select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (clicks[d.old_id] = d.id)));
    const missions = {} as { [key: string]: string };
    await prisma.mission
      .findMany({ select: { id: true, client_id: true, partner: { select: { old_id: true } } } })
      .then((data) => data.forEach((d) => (missions[`${d.client_id}-${d.partner?.old_id}`] = d.id)));
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
                      "type.keyword": "apply",
                    },
                  },
                  {
                    range: {
                      createdAt: {
                        gte: "now-14d/d",
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
        console.log(`[Applies] Total hits ${body.hits.total.value}, scrollId ${scrollId}`);
      }

      if (data.length === 0) {
        break;
      }

      const dataToCreate = [];
      for (const hit of data) {
        let clickId;
        if (hit._source.clickId) {
          clickId = clicks[hit._source.clickId];
          if (!clickId) {
            const res = await prisma.click.findFirst({ where: { old_id: hit._source.clickId }, select: { id: true } });
            if (res) {
              clickId = res.id;
              clicks[hit._source.clickId] = clickId;
            } else {
              console.log(`[Applies] Click ${hit._source.clickId} not found for doc ${hit._id.toString()}`);
            }
          }
        }
        const obj = await buildData({ _id: hit._id, ...hit._source }, partners, missions, campaigns, widgets, clickId);
        if (!obj) continue;
        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.apply.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Applies] Created ${res.count} docs, ${created} created so far.`);
      }
    }

    console.log(`[Applies] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
  } catch (error) {
    captureException(error, "[Applies] Error while syncing docs.");
  }
};
export default handler;
