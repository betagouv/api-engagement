import { STATS_INDEX } from "../../../config";
import { Impression } from "../../../db/analytics";
import esClient from "../../../db/elastic";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import { Stats } from "../../../types";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: Stats,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string }
) => {
  const partnerFromId = partners[doc.fromPublisherId?.toString()];
  if (!partnerFromId) {
    console.log(`[Prints] Partner ${doc.fromPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }
  const partnerToId = partners[doc.toPublisherId?.toString()];
  if (!partnerToId) {
    console.log(`[Prints] Partner ${doc.toPublisherId?.toString()} not found for doc ${doc._id.toString()}`);
    return null;
  }

  let missionId;
  if (doc.missionClientId && doc.toPublisherId) {
    missionId = missions[`${doc.missionClientId}-${doc.toPublisherId}`];
    if (!missionId) {
      console.log(`[Prints] Mission ${doc.missionId?.toString()} not found for doc ${doc._id.toString()}`);
      const m = await prismaClient.mission.findFirst({
        where: { old_id: doc.missionId?.toString() },
        select: { id: true },
      });
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
    if (widget) {
      sourceId = widget;
    }
  } else if (doc.source === "campaign") {
    const campaign = campaigns[doc.sourceId];
    if (campaign) {
      sourceId = campaign;
    }
  } else if (doc.source === "publisher") {
    const publisher = partners[doc.sourceId];
    if (publisher) {
      sourceId = publisher;
    }
  }

  const obj = {
    old_id: doc._id,
    mission_id: missionId ? missionId : null,
    mission_old_id: doc.missionId ? doc.missionId : null,
    created_at: new Date(doc.createdAt),
    host: doc.host,
    source: !doc.source || doc.source === "publisher" || doc.source === "jstag" ? "api" : doc.source,
    source_id: sourceId ? sourceId : null,
    campaign_id: sourceId && doc.source === "campaign" ? sourceId : null,
    widget_id: sourceId && doc.source === "widget" ? sourceId : null,
    to_partner_id: partnerToId,
    from_partner_id: partnerFromId,
  } as Impression;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Prints] Started at ${start.toISOString()}.`);
    let created = 0;
    let scrollId = null;

    const stored = await prismaClient.impression.count();
    console.log(`[Prints] Found ${stored} docs in database PG`);

    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    const campaigns = {} as { [key: string]: string };
    await prismaClient.campaign.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (campaigns[d.old_id] = d.id)));
    const widgets = {} as { [key: string]: string };
    await prismaClient.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

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
                      "type.keyword": "print",
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
        console.log(`[Prints] Total hits ${body.hits.total.value}`);
      }

      if (data.length === 0) {
        break;
      }

      const missions = {} as { [key: string]: string };
      const missionIds = new Set<string>(data.map((hit: { _source: Stats }) => hit._source.missionClientId?.toString()).filter((id: string | undefined) => id !== undefined));
      console.log(`[Prints] Found ${missionIds.size} missions in Elasticsearch`);
      await prismaClient.mission
        .findMany({
          where: {
            client_id: { in: Array.from(missionIds) },
          },
          select: { id: true, client_id: true, partner: { select: { old_id: true } } },
        })
        .then((data) => data.forEach((d) => (missions[`${d.client_id}-${d.partner?.old_id}`] = d.id)));
      console.log(`[Prints] Found ${Object.keys(missions).length} missions in database PG`);

      const dataToCreate = [];
      for (const hit of data) {
        const obj = await buildData({ _id: hit._id, ...hit._source }, partners, missions, campaigns, widgets);
        if (!obj) {
          continue;
        }
        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        const res = await prismaClient.impression.createMany({
          data: dataToCreate,
          skipDuplicates: true,
        });
        created += res.count;
        console.log(`[Prints] Created ${res.count} docs, ${created} created so far.`);
      }

      console.log(`[Prints] Processed ${data.length} docs.`);
    }

    console.log(`[Prints] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Prints] Error while syncing docs.");
  }
};

export default handler;
