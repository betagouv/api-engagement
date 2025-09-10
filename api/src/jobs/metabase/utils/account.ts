import esClient from "../../../db/elastic";
import { prismaAnalytics as prisma } from "../../../db/postgres";

import { Account } from "@prisma/client";
import { STATS_INDEX } from "../../../config";
import { captureException } from "../../../error";
import { Stats } from "../../../types";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: Stats,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string },
  clickId: string | undefined
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
  if (doc.missionClientId && doc.toPublisherId) {
    missionId = missions[`${doc.missionClientId}-${doc.toPublisherId}`];
    if (!missionId) {
      const m = await prisma.mission.findFirst({
        where: { old_id: doc.missionId?.toString() },
        select: { id: true },
      });
      if (m) {
        missionId = m.id;
      } else {
        console.log(`[Accounts] Mission ${doc.missionId?.toString()} not found for doc ${doc._id.toString()}`);
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
  } as Account;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Accounts] Started at ${start.toISOString()}.`);
    let created = 0;
    let updated = 0;
    let scrollId = null;

    const stored = await prisma.apply.count();
    console.log(`[Accounts] Found ${stored} docs in database.`);
    // Select clicks from the last 2 months
    const whereClicks = {
      created_at: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62), lte: new Date() },
    };
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
      let data: { _id: string; _source: Stats }[] = [];

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
          body: { query: { term: { "type.keyword": "account" } } },
          track_total_hits: true,
        });
        scrollId = body._scroll_id;
        data = body.hits.hits as { _id: string; _source: Stats }[];
        console.log(`[Accounts] Total hits ${body.hits.total.value}, scrollId ${scrollId}`);
      }

      if (data.length === 0) {
        break;
      }

      const stored = {} as { [key: string]: { click_id: string | null } };
      await prisma.account
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, click_id: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d)));

      const clicks = {} as { [key: string]: string };
      const clickIds: string[] = [];
      data.forEach((hit) => hit._source.clickId && clickIds.push(hit._source.clickId));
      if (clickIds.length) {
        await prisma.click.findMany({ where: { old_id: { in: clickIds } }, select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (clicks[d.old_id] = d.id)));
      }

      const dataToCreate: Account[] = [];
      const dataToUpdate: Account[] = [];

      for (const hit of data) {
        let clickId;
        if (hit._source.clickId) {
          clickId = clicks[hit._source.clickId];
          if (!clickId) {
            const res = await prisma.click.findFirst({
              where: { old_id: hit._source.clickId },
              select: { id: true },
            });
            if (res) {
              clickId = res.id;
              clicks[hit._source.clickId] = clickId;
            } else {
              console.log(`[Accounts] Click ${hit._source.clickId} not found for doc ${hit._id.toString()}`);
            }
          }
        }
        const obj = await buildData({ ...hit._source, _id: hit._id }, partners, missions, campaigns, widgets, clickId);
        if (!obj) {
          continue;
        }

        if (stored[hit._id.toString()] && stored[hit._id.toString()].click_id !== obj.click_id) {
          dataToUpdate.push(obj);
        } else if (!stored[hit._id.toString()]) {
          dataToCreate.push(obj);
        }
      }

      console.log(`[Accounts] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      if (dataToCreate.length) {
        const res = await prisma.account.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Accounts] Created ${res.count} docs, ${created} created so far.`);
      }

      if (dataToUpdate.length) {
        console.log(`[Accounts] Updating ${dataToUpdate.length} docs.`);
        const transactions = [];
        for (const obj of dataToUpdate) {
          transactions.push(prisma.account.update({ where: { old_id: obj.old_id }, data: obj }));
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prisma.$transaction(transactions.slice(i, i + 100));
        }
      }
      updated += dataToUpdate.length;
      console.log(`[Accounts] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);
    }

    console.log(`[Accounts] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Accounts] Error while syncing docs.");
  }
};

export default handler;
