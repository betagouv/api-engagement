import { prismaAnalytics as prismaClient } from "../../../db/postgres";

import { Click } from "../../../db/analytics";
import { captureException } from "../../../error";
import { statEventService } from "../../../services/stat-event";
import { StatEventRecord } from "../../../types";

const BATCH_SIZE = 5000;

const getReferer = (doc: StatEventRecord) => {
  if (!doc.referer) {
    return null;
  }
  try {
    const url = new URL(doc.referer);
    return url.href;
  } catch (error) {
    return null;
  }
};

const buildData = async (
  doc: StatEventRecord,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string },
  widgets: { [key: string]: string }
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
  if (doc.missionId) {
    missionId = missions[doc.missionId?.toString()];
    if (!missionId) {
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
  } else if (doc.missionClientId && doc.toPublisherId) {
    const m = await prismaClient.mission.findFirst({
      where: { client_id: doc.missionClientId?.toString(), partner: { old_id: doc.toPublisherId?.toString() } },
      select: { id: true, old_id: true },
    });
    if (m) {
      missionId = m.id;
      missions[m.old_id] = missionId;
    } else {
      console.log(`[Clicks] Mission ${doc.missionClientId?.toString()} not found for doc ${doc._id.toString()}`);
    }
  } else if (["widget", "publisher"].includes(doc.source)) {
    console.log(`[Clicks] No mission found for doc ${doc._id.toString()} and source ${doc.source}`);
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
    url_origin: getReferer(doc),
    tag: doc.tag,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    source: !doc.source || doc.source === "publisher" ? "api" : doc.source,
    source_id: sourceId ? sourceId : null,
    campaign_id: sourceId && doc.source === "campaign" ? sourceId : null,
    widget_id: sourceId && doc.source === "widget" ? sourceId : null,
    to_partner_id: partnerToId,
    from_partner_id: partnerFromId,
    is_bot: typeof doc.isBot === "boolean" ? doc.isBot : false,
    is_human: typeof doc.isHuman === "boolean" ? doc.isHuman : false,
  } as Click;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Clicks] Started at ${start.toISOString()}.`);
    let total = 0;
    let processed = 0;
    let created = 0;
    let cursor: string | null = null;

    const stored = await prismaClient.click.count();
    console.log(`[Clicks] Found ${stored} docs in database.`);

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
      } = await statEventService.scrollStatEvents({
        type: "click",
        batchSize: BATCH_SIZE,
        cursor,
        filters: { exportToPgStatusMissing: true },
      });

      const data = events;
      if (!cursor) {
        total = count;
        console.log(`[Clicks] Total hits ${total}`);
      }
      cursor = nextCursor;

      if (data.length === 0) {
        break;
      }
      console.log(`[Clicks] Found ${data.length} docs in stats storage, processed ${processed} docs so far, ${total - processed} docs left.`);

      const missions = {} as { [key: string]: string };
      const missionIds = new Set<string>((data as StatEventRecord[]).map((hit) => hit.missionId?.toString()).filter((id): id is string => typeof id === "string"));
      if (missionIds.size) {
        await prismaClient.mission
          .findMany({
            where: {
              old_id: { in: Array.from(missionIds) },
            },
            select: { id: true, old_id: true },
          })
          .then((data) => data.forEach((d) => (missions[d.old_id] = d.id)));
      }

      const toCreate: Click[] = [];
      const successIds: string[] = [];
      const failureIds: string[] = [];
      for (const hit of data as StatEventRecord[]) {
        const obj = await buildData(hit, partners, missions, campaigns, widgets);
        if (!obj) {
          failureIds.push(hit._id as string);
          continue;
        }
        toCreate.push(obj);
      }

      // Create data in PG
      if (toCreate.length) {
        try {
          const res = await prismaClient.click.createMany({ data: toCreate, skipDuplicates: true });
          created += res.count;
          successIds.push(...toCreate.map((t) => t.old_id));
          console.log(`[Clicks] Created ${res.count} docs, ${created} created so far.`);
        } catch (error) {
          captureException(error, "[Clicks] Error during bulk createMany to PG");
          failureIds.push(...toCreate.map((t) => t.old_id));
        }
      }

      // Update export status for processed docs
      if (successIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(successIds, "SUCCESS");
        console.log(`[Clicks] Marked ${successIds.length} docs as SUCCESS in stats storage.`);
      }
      if (failureIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(failureIds, "FAILURE");
        console.log(`[Clicks] Marked ${failureIds.length} docs as FAILURE in stats storage.`);
      }
      processed += data.length;
    }

    console.log(`[Clicks] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Clicks] Error while syncing docs.");
  }
};

export default handler;
