import { Impression } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import { statEventService } from "../../../services/stat-event";
import { StatEventRecord } from "../../../types";

const BATCH_SIZE = 5000;

const buildData = async (
  doc: StatEventRecord,
  partners: { [key: string]: string },
  missions: { [key: string]: string },
  campaigns: { [key: string]: string }
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

  let sourceId = doc.sourceId ?? null;
  if (doc.source === "campaign") {
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
    widget_id: doc.source === "widget" ? doc.sourceId ?? null : null,
    to_partner_id: partnerToId,
    from_partner_id: partnerFromId,
  } as Impression;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Prints] Started at ${start.toISOString()}.`);
    let total = 0;
    let processed = 0;
    let created = 0;
    let cursor: string | null = null;

    const stored = await prismaClient.impression.count();
    console.log(`[Prints] Found ${stored} docs in database PG`);

    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));
    const campaigns = {} as { [key: string]: string };
    await prismaClient.campaign.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (campaigns[d.old_id] = d.id)));

    while (true) {
      const {
        events,
        cursor: nextCursor,
        total: count,
      } = await statEventService.scrollStatEvents({
        type: "print",
        batchSize: BATCH_SIZE,
        cursor,
        filters: { exportToPgStatusMissing: true },
      });

      const data = events;
      if (!cursor) {
        total = count;
        console.log(`[Prints] Total hits ${total}`);
      }
      cursor = nextCursor;

      if (data.length === 0) {
        break;
      }
      console.log(`[Prints] Found ${data.length} docs in stats storage, processed ${processed} docs so far, ${total - processed} docs left.`);

      const missions = {} as { [key: string]: string };
      const missionIds = new Set<string>((data as StatEventRecord[]).map((hit) => hit.missionId?.toString()).filter((id): id is string => typeof id === "string"));

      await prismaClient.mission
        .findMany({
          where: {
            client_id: { in: Array.from(missionIds) },
          },
          select: { id: true, client_id: true, partner: { select: { old_id: true } } },
        })
        .then((data) => data.forEach((d) => (missions[`${d.client_id}-${d.partner?.old_id}`] = d.id)));

      const dataToCreate = [] as Impression[];
      const successIds: string[] = [];
      const failureIds: string[] = [];
      for (const hit of data as StatEventRecord[]) {
        const obj = await buildData(hit, partners, missions, campaigns);
        if (!obj) {
          failureIds.push(hit._id as string);
          continue;
        }
        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        try {
          const res = await prismaClient.impression.createMany({
            data: dataToCreate,
            skipDuplicates: true,
          });
          created += res.count;
          successIds.push(...dataToCreate.map((t) => (t as any).old_id));
          console.log(`[Prints] Created ${res.count} docs, ${created} created so far.`);
        } catch (error) {
          captureException(error, "[Prints] Error during bulk createMany to PG");
          failureIds.push(...dataToCreate.map((t) => (t as any).old_id));
        }
      }

      // Update export status for processed docs
      if (successIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(successIds, "SUCCESS");
        console.log(`[Prints] Marked ${successIds.length} docs as SUCCESS in stats storage.`);
      }
      if (failureIds.length > 0) {
        await statEventService.updateStatEventsExportStatus(failureIds, "FAILURE");
        console.log(`[Prints] Marked ${failureIds.length} docs as FAILURE in stats storage.`);
      }

      processed += data.length;
    }

    console.log(`[Prints] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Prints] Error while syncing docs.");
  }
};

export default handler;
