import { prismaAnalytics as prismaClient } from "../../../db/postgres";

import { Account } from "../../../db/analytics";
import { captureException } from "../../../error";
import { statEventService } from "../../../services/stat-event";
import { StatEventRecord } from "../../../types";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: StatEventRecord,
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
      const m = await prismaClient.mission.findFirst({
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
    let total = 0;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let cursor: string | null = null;

    const stored = await prismaClient.apply.count();
    console.log(`[Accounts] Found ${stored} docs in database.`);
    // Select clicks from the last 2 months
    const whereClicks = {
      created_at: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62), lte: new Date() },
    };
    const clicks = {} as { [key: string]: string };
    await prismaClient.click.findMany({ where: whereClicks, select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (clicks[d.old_id] = d.id)));
    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    const campaigns = {} as { [key: string]: string };
    await prismaClient.campaign.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (campaigns[d.old_id] = d.id)));
    const widgets = {} as { [key: string]: string };
    await prismaClient.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

    while (true) {
      const { events, cursor: nextCursor, total: count } = await statEventService.scrollStatEvents({
        type: "account",
        batchSize: BATCH_SIZE,
        cursor,
        filters: { exportToPgStatusMissing: true },
      });

      const data = events;
      if (!cursor) {
        total = count;
        console.log(`[Accounts] Total hits ${total}`);
      }
      cursor = nextCursor;

      if (data.length === 0) {
        break;
      }
      console.log(`[Accounts] Found ${data.length} docs in stats storage, processed ${processed} docs so far, ${total - processed} docs left.`);

      const stored = {} as { [key: string]: { click_id: string | null } };
      await prismaClient.account
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, click_id: true },
        })
        .then((data) => data.forEach((d) => (stored[d.old_id] = d)));

      const clicks = {} as { [key: string]: string };
      const clickIds: string[] = [];
      data.forEach((hit) => hit.clickId && clickIds.push(hit.clickId));
      if (clickIds.length) {
        await prismaClient.click
          .findMany({ where: { old_id: { in: clickIds } }, select: { id: true, old_id: true } })
          .then((data) => data.forEach((d) => (clicks[d.old_id] = d.id)));
      }

      const dataToCreate: Account[] = [];
      const dataToUpdate: Account[] = [];
      const successIds: string[] = [];
      const failureIds: string[] = [];

      const missions = {} as { [key: string]: string };
      const missionIds = new Set<string>(data.map((hit: StatEventRecord) => hit.missionClientId?.toString()).filter((id: string | undefined) => id !== undefined));

      await prismaClient.mission
        .findMany({
          where: { client_id: { in: Array.from(missionIds) } },
          select: { id: true, client_id: true, partner: { select: { old_id: true } } },
        })
        .then((data) => data.forEach((d) => (missions[`${d.client_id}-${d.partner?.old_id}`] = d.id)));

      for (const hit of data) {
        let clickId;
        if (hit.clickId) {
          clickId = clicks[hit.clickId];
          if (!clickId) {
            const res = await prismaClient.click.findFirst({
              where: { old_id: hit.clickId },
              select: { id: true },
            });
            if (res) {
              clickId = res.id;
              clicks[hit.clickId] = clickId;
            } else {
              console.log(`[Accounts] Click ${hit.clickId} not found for doc ${hit._id.toString()}`);
            }
          }
        }
        const obj = await buildData(hit, partners, missions, campaigns, widgets, clickId);
        if (!obj) {
          failureIds.push(hit._id as string);
          continue;
        }

        if (stored[hit._id.toString()] && stored[hit._id.toString()].click_id !== obj.click_id) {
          dataToUpdate.push(obj);
        } else if (!stored[hit._id.toString()]) {
          dataToCreate.push(obj);
        } else {
          successIds.push(hit._id as string);
        }
      }

      console.log(`[Accounts] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      if (dataToCreate.length) {
        try {
          const res = await prismaClient.account.createMany({ data: dataToCreate, skipDuplicates: true });
          created += res.count;
          successIds.push(...dataToCreate.map((t) => (t as any).old_id));
          console.log(`[Accounts] Created ${res.count} docs, ${created} created so far.`);
        } catch (error) {
          captureException(error, "[Accounts] Error during bulk createMany to PG");
          failureIds.push(...dataToCreate.map((t) => (t as any).old_id));
        }
      }

      if (dataToUpdate.length) {
        console.log(`[Accounts] Updating ${dataToUpdate.length} docs.`);
        const transactions = [];
        const toMarkUpdated: string[] = [];
        for (const obj of dataToUpdate) {
          transactions.push(prismaClient.account.update({ where: { old_id: obj.old_id }, data: obj }));
          toMarkUpdated.push((obj as any).old_id);
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prismaClient.$transaction(transactions.slice(i, i + 100));
        }
        successIds.push(...toMarkUpdated);
      }
      updated += dataToUpdate.length;
      console.log(`[Accounts] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);

      // Update export status for processed docs
      if (successIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(successIds, "SUCCESS");
        console.log(`[Accounts] Marked ${successIds.length} docs as SUCCESS in stats storage.`);
      }
      if (failureIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(failureIds, "FAILURE");
        console.log(`[Accounts] Marked ${failureIds.length} docs as FAILURE in stats storage.`);
      }
      processed += data.length;
    }

    console.log(`[Accounts] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Accounts] Error while syncing docs.");
  }
};

export default handler;
