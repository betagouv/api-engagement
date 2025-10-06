import { prismaAnalytics as prismaClient } from "../../../db/postgres";

import { Apply } from "../../../db/analytics";
import { captureException } from "../../../error";
import statEventRepository from "../../../repositories/stat-event";
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
      const m = await prismaClient.mission.findFirst({
        where: { old_id: doc.missionId?.toString() },
        select: { id: true },
      });
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
    status: doc.status || null,
    custom_attributes: (doc.customAttributes as any) ?? null,
  } as Apply;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Applies] Started at ${start.toISOString()}.`);
    let total = 0;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let cursor: string | null = null;

    const count = await prismaClient.apply.count();
    console.log(`[Applies] Found ${count} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    const campaigns = {} as { [key: string]: string };
    await prismaClient.campaign.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (campaigns[d.old_id] = d.id)));
    const widgets = {} as { [key: string]: string };
    await prismaClient.widget.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (widgets[d.old_id] = d.id)));

    while (true) {
      const {
        events,
        cursor: nextCursor,
        total: count,
      } = await statEventRepository.scrollStatEvents({
        type: "apply",
        batchSize: BATCH_SIZE,
        cursor,
        filters: { exportToPgStatusMissing: true },
      });

      const data = events;
      if (!cursor) {
        total = count;
        console.log(`[Applies] Total hits ${total}`);
      }
      cursor = nextCursor;

      if (data.length === 0) {
        break;
      }
      console.log(`[Applies] Found ${data.length} docs in stats storage, processed ${processed} docs so far, ${total - processed} docs left.`);

      const stored = {} as { [key: string]: { status: string | null; click_id: string | null } };
      await prismaClient.apply
        .findMany({
          where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
          select: { old_id: true, status: true, click_id: true },
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

      const missions = {} as { [key: string]: string };
      const missionIds = new Set<string>(data.map((hit: Stats) => hit.missionClientId?.toString()).filter((id) => id !== undefined));

      await prismaClient.mission
        .findMany({
          where: {
            client_id: { in: Array.from(missionIds) },
          },
          select: { id: true, client_id: true, partner: { select: { old_id: true } } },
        })
        .then((data) => data.forEach((d) => (missions[`${d.client_id}-${d.partner?.old_id}`] = d.id)));
      console.log(`[Applies] Found ${Object.keys(missions).length} missions in database PG`);

      const dataToCreate = [] as Apply[];
      const dataToUpdate = [] as Apply[];
      const successIds: string[] = [];
      const failureIds: string[] = [];

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
              console.log(`[Applies] Click ${hit.clickId} not found for doc ${hit._id.toString()}`);
            }
          }
        }
        const obj = await buildData(hit, partners, missions, campaigns, widgets, clickId);
        if (!obj) {
          failureIds.push(hit._id as string);
          continue;
        }

        if (stored[hit._id.toString()] && (stored[hit._id.toString()].status !== obj.status || stored[hit._id.toString()].click_id !== obj.click_id)) {
          console.log("UPDATE");
          console.log("status", stored[hit._id.toString()].status !== obj.status, stored[hit._id.toString()].status, obj.status);
          console.log("click_id", stored[hit._id.toString()].click_id !== obj.click_id, stored[hit._id.toString()].click_id, obj.click_id);
          dataToUpdate.push(obj);
        } else if (!stored[hit._id.toString()]) {
          dataToCreate.push(obj);
        } else {
          successIds.push(hit._id as string);
        }
      }

      console.log(`[Applies] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`);

      if (dataToCreate.length) {
        console.log(`[Applies] Creating ${dataToCreate.length} docs.`);
        try {
          const res = await prismaClient.apply.createMany({ data: dataToCreate, skipDuplicates: true });
          created += res.count;
          successIds.push(...dataToCreate.map((t) => (t as any).old_id));
          console.log(`[Applies] Created ${res.count} docs, ${created} created so far.`);
        } catch (error) {
          captureException(error, "[Applies] Error during bulk createMany to PG");
          failureIds.push(...dataToCreate.map((t) => (t as any).old_id));
        }
      }

      if (dataToUpdate.length) {
        console.log(`[Applies] Updating ${dataToUpdate.length} docs.`);
        const transactions = [];
        const toMarkUpdated: string[] = [];
        for (const obj of dataToUpdate) {
          transactions.push(prismaClient.apply.update({ where: { old_id: obj.old_id }, data: obj }));
          toMarkUpdated.push((obj as any).old_id);
        }
        for (let i = 0; i < transactions.length; i += 100) {
          await prismaClient.$transaction(transactions.slice(i, i + 100));
        }
        successIds.push(...toMarkUpdated);
      }
      updated += dataToUpdate.length;
      console.log(`[Applies] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`);

      // Update export status for processed docs
      if (successIds.length > 0) {
        await statEventRepository.setStatEventsExportStatus(successIds, "SUCCESS");
        console.log(`[Applies] Marked ${successIds.length} docs as SUCCESS in stats storage.`);
      }
      if (failureIds.length > 0) {
        await statEventRepository.setStatEventsExportStatus(failureIds, "FAILURE");
        console.log(`[Applies] Marked ${failureIds.length} docs as FAILURE in stats storage.`);
      }
      processed += data.length;
    }
    console.log(`[Applies] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created, updated };
  } catch (error) {
    captureException(error, "[Applies] Error while syncing docs.");
  }
};
export default handler;
