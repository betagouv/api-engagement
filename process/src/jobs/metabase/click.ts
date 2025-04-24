import esClient from "../../db/elastic";
import prisma from "../../db/postgres";

import { STATS_INDEX } from "../../config";
import { captureException } from "../../error";
import { Stats } from "../../types";
import { Click } from "@prisma/client";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: Stats,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string },
) => {
  const partnerFromId = partners[doc.fromPublisherId?.toString()];
  if (!partnerFromId) {
    console.log(`[Clicks] Partner ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const partnerToId = partners[doc.toPublisherId?.toString()];
  if (!partnerToId) {
    console.log(`[Clicks] Partner ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
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
        console.log(`[Clicks] Mission ${doc.missionId?.toString()} not found for doc ${doc._id.toString()}`);
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
    mission_id: missionId ? missionId : null,
    mission_old_id: doc.missionId ? doc.missionId : null,
    created_at: new Date(doc.createdAt),
    host: doc.host,
    tag: doc.tag,
    tags: doc.tags,
    source: !doc.source || doc.source === "publisher" ? "api" : doc.source,
    source_id: sourceId ? sourceId : null,
    campaign_id: sourceId && doc.source === "campaign" ? sourceId : null,
    widget_id: sourceId && doc.source === "widget" ? sourceId : null,
    to_partner_id: partnerToId,
    from_partner_id: partnerFromId,
    is_bot: doc.isBot || null,
    is_human: doc.isHuman || null,
  } as Click;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Clicks] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId = null;

    const stored = await prisma.click.count();
    console.log(`[Clicks] Found ${stored} docs in database.`);

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
                      "type.keyword": "click",
                    },
                  },
                  {
                    range: {
                      createdAt: {
                        gte: "now-14d/d",
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
        console.log(`[Clicks] Total hits ${body.hits.total.value}, scrollId ${scrollId}`);
      }

      if (data.length === 0) {
        break;
      }

      const dataToCreate = [];
      for (const hit of data) {
        const obj = await buildData({ _id: hit._id, ...hit._source }, partners, missions, campaigns, widgets);
        if (!obj) continue;

        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        const res = await prisma.click.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Clicks] Created ${res.count} docs, ${created} created so far.`);
      }
    }

    console.log(`[Clicks] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Clicks] Error while syncing docs.");
  }
};

export default handler;
