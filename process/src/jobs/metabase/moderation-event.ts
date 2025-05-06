import { ModerationEvent as PgModerationEvent } from "@prisma/client";
import prisma from "../../db/postgres";
import { captureException, captureMessage } from "../../error";
import ModerationEventModel from "../../models/moderation-event";
import { ModerationEvent } from "../../types";

const BATCH_SIZE = 5000;

const buildData = (
  doc: ModerationEvent,
  missions: { [key: string]: string },
  users: { [key: string]: string }
) => {
  const missionId = missions[doc.missionId];
  if (!missionId) {
    captureMessage(
      "[Metabase-ModerationEvent] Mission not found",
      `${doc.missionId} not found for doc ${doc._id.toString()}`
    );
    return null;
  }
  const userId = doc.userId ? users[doc.userId] : null;
  if (!userId && doc.userId) {
    captureMessage(
      "[Metabase-ModerationEvent] User not found",
      `${doc.userId} not found for doc ${doc._id.toString()}`
    );
    return null;
  }
  const obj = {
    old_id: doc._id.toString(),
    mission_id: missionId,
    user_id: userId,
    user_name: doc.userName,
    initial_status: doc.initialStatus?.toLowerCase() || null,
    new_status: doc.newStatus?.toLowerCase() || null,
    initial_title: doc.initialTitle,
    new_title: doc.newTitle,
    initial_comment: doc.initialComment || null,
    new_comment: doc.newComment || null,
    initial_note: doc.initialNote,
    new_note: doc.newNote,
    initial_siren: doc.initialSiren,
    new_siren: doc.newSiren,
    initial_rna: doc.initialRNA,
    new_rna: doc.newRNA,
    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
  } as PgModerationEvent;
  return obj;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    let created = 0;
    let updated = 0;
    let offset = 0;

    const count = await prisma.widgetQuery.count();
    console.log(`[Widget-Requests] Found ${count} docs in database.`);

    const users = {} as { [key: string]: string };
    await prisma.user
      .findMany({ select: { id: true, old_id: true } })
      .then((data) => data.forEach((d) => (users[d.old_id] = d.id)));
    console.log(`[ModerationEvent] Mapped ${Object.keys(users).length} users to database IDs.`);

    const countToSync = await ModerationEventModel.countDocuments();
    console.log(`[ModerationEvent] Found ${countToSync} docs to sync.`);

    const stored = {} as { [key: string]: { updated_at: Date } };
    await prisma.moderationEvent
      .findMany({ select: { old_id: true, updated_at: true } })
      .then((data) => data.forEach((d) => (stored[d.old_id] = d)));

    while (true) {
      const data = await ModerationEventModel.find()
        .limit(BATCH_SIZE)
        .skip(offset * BATCH_SIZE)
        .lean();
      if (!data.length) {
        break;
      }

      const missions = {} as { [key: string]: string };
      await prisma.mission
        .findMany({
          where: { old_id: { in: data.map((hit) => hit.missionId) } },
          select: { old_id: true, id: true },
        })
        .then((data) => data.forEach((d) => (missions[d.old_id] = d.id)));
      console.log(
        `[ModerationEvent] Mapped ${Object.keys(missions).length} missions to database IDs.`
      );

      const dataToCreate = [] as PgModerationEvent[];
      const dataToUpdate = [] as PgModerationEvent[];

      for (const doc of data) {
        const res = buildData(doc as ModerationEvent, missions, users);
        if (!res) {
          continue;
        }
        if (
          stored[doc._id.toString()] &&
          !isDateEqual(stored[doc._id.toString()].updated_at, res.updated_at)
        ) {
          dataToUpdate.push(res);
        } else if (!stored[doc._id.toString()]) {
          dataToCreate.push(res);
        }
      }
      console.log(
        `[ModerationEvent] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update.`
      );
      // Create data
      if (dataToCreate.length) {
        const res = await prisma.moderationEvent.createManyAndReturn({
          data: dataToCreate,
          skipDuplicates: true,
        });
        console.log(
          `[ModerationEvent] Created ${res.length} moderation events, ${created} created so far.`
        );
        created += res.length;
      }

      // Update data
      if (dataToUpdate.length) {
        for (const obj of dataToUpdate) {
          try {
            await prisma.moderationEvent.upsert({
              where: { old_id: obj.old_id },
              update: obj,
              create: obj,
            });
            updated += 1;
          } catch (error) {
            captureException(error, `[ModerationEvent] Error while syncing doc ${obj.old_id}`);
          }
        }
        console.log(
          `[ModerationEvent] Updated ${dataToUpdate.length} docs, ${updated} updated so far.`
        );
      }
      offset += BATCH_SIZE;
    }

    console.log(
      `[ModerationEvent] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`
    );
    return { created, updated };
  } catch (error) {
    captureException(error, "[ModerationEvent] Error while syncing docs.");
  }
};

export default handler;
