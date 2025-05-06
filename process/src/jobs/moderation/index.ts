/*
Here the job is to update the moderation status of the jva partners. The issue here is that the moderation
was buit to be open to all partners, but we know only JVA is using it. Would have been better to directly have
a moderation_jva collection.
*/

import { SLACK_CRON_CHANNEL_ID } from "../../config";
import { captureException } from "../../error";
import MissionModel from "../../models/mission";
import ModerationEventModel from "../../models/moderation-event";
import PublisherModel from "../../models/publisher";
import { postMessage } from "../../services/slack";
import { Mission, Publisher } from "../../types";

interface ModerationUpdate {
  status: string | null;
  comment: string | null;
  note: string | null;
  date: Date | null;
}

const findMissions = async (moderator: Publisher) => {
  const publishers = moderator.publishers.map((p) => p.publisher);
  const where = {
    publisherId: { $in: publishers },
    statusCode: "ACCEPTED",
    deleted: false,
    $or: [
      { [`moderation_${moderator._id}_status`]: { $exists: false } },
      { [`moderation_${moderator._id}_status`]: null },
      { [`moderation_${moderator._id}_status`]: "PENDING" },
    ],
  };
  const missions = await MissionModel.find(where).sort({ createdAt: "desc" });
  return missions;
};

const hasModerationChanges = (m: Mission, moderator: Publisher, update: ModerationUpdate) => {
  if (!m[`moderation_${moderator._id}_status`]) {
    return true;
  }
  if ((m[`moderation_${moderator._id}_status`] || null) !== update.status) {
    return true;
  }
  if ((m[`moderation_${moderator._id}_comment`] || null) !== update.comment) {
    return true;
  }
  if ((m[`moderation_${moderator._id}_note`] || null) !== update.note) {
    return true;
  }
  return false;
};

const createModerations = async (missions: Mission[], moderator: Publisher) => {
  const missonBulk = [] as any[];
  const eventBulk = [] as any[];

  let refused = 0;
  let pending = 0;
  for (const m of missions) {
    const update = {
      status: "PENDING",
      comment: null,
      note: null,
      date: null,
    } as ModerationUpdate;

    /** ONLY JVA RULES */
    //   "Autre",
    //   "La mission a déjà été publiée sur JeVeuxAider.gouv.fr",
    //   "Le contenu est insuffisant / non qualitatif",
    //   "La date de la mission n’est pas compatible avec le recrutement de bénévoles",
    //   "La mission ne respecte pas la charte de la Réserve Civique",
    //   "L'organisation est déjà inscrite sur JeVeuxAider.gouv.fr",
    //   "L’organisation n’est pas conforme à la charte de la Réserve Civique",
    //   "Les informations sont insuffisantes pour modérer l’organisation",

    const createdAt = new Date(m.createdAt);
    const startAt = new Date(m.startAt);
    const endAt = m.endAt ? new Date(m.endAt) : null;

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in21Days = new Date();
    in21Days.setDate(in21Days.getDate() + 21);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (sixMonthsAgo > createdAt) {
      update.status = "REFUSED";
      update.comment = "MISSION_CREATION_DATE_TOO_OLD";
      update.date = new Date();
    } else if (endAt && startAt < in7Days && endAt < in21Days) {
      update.status = "REFUSED";
      update.comment = "MISSION_DATE_NOT_COMPATIBLE";
      update.date = new Date();
    } else if (m.description.length < 300) {
      update.status = "REFUSED";
      update.comment = "CONTENT_INSUFFICIENT";
      update.date = new Date();
    } else if (!m.city) {
      update.status = "REFUSED";
      update.comment = "CONTENT_INSUFFICIENT";
      update.date = new Date();
    }

    if (!hasModerationChanges(m, moderator, update)) {
      continue;
    }

    eventBulk.push({
      insertOne: {
        document: {
          missionId: m._id,
          moderatorId: moderator._id,
          userId: null,
          userName: "Modération automatique",
          initialStatus: m[`moderation_${moderator._id}_status`] || null,
          newStatus: update.status,
          initialComment: m[`moderation_${moderator._id}_comment`] || null,
          newComment: update.comment,
          initialNote: m[`moderation_${moderator._id}_note`] || null,
          newNote:
            update.status === "REFUSED"
              ? `Data de la mission refusée: date de création=${createdAt.toLocaleDateString("fr")}, date de début=${startAt.toLocaleDateString("fr")}, date defin=${endAt ? endAt.toLocaleDateString("fr") : "non renseigné"}, nombre caractères description=${m.description.length}, ville=${m.city}`
              : "",
        },
      },
    });
    missonBulk.push({
      updateOne: {
        filter: { _id: m._id },
        update: {
          $set: {
            [`moderation_${moderator._id}_status`]: update.status,
            [`moderation_${moderator._id}_comment`]: update.comment,
            [`moderation_${moderator._id}_note`]: update.note,
            [`moderation_${moderator._id}_date`]: update.date,
          },
        },
      },
    });

    if (update.status === "REFUSED") {
      refused++;
    }
    if (update.status === "PENDING") {
      pending++;
    }
  }

  const res = await MissionModel.bulkWrite(missonBulk);
  const resEvent = await ModerationEventModel.bulkWrite(eventBulk);
  return { updated: res.modifiedCount, events: resEvent.insertedCount, refused, pending };
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Moderation] Starting at ${start.toISOString()}`);

    const moderators = await PublisherModel.find({ moderator: true });

    for (let i = 0; i < moderators.length; i++) {
      const moderator = moderators[i];

      if (!moderator.publishers || !moderator.publishers.length) {
        continue;
      }

      console.log(
        `[Moderation] Starting for ${moderator.name} (${moderator._id}), number ${i + 1}/${moderators.length}`
      );

      const data = await findMissions(moderator);
      console.log(
        `[Moderation] - ${moderator.name} ${data.length} found in pending moderation yet`
      );

      if (!data.length) {
        continue;
      }

      const res = await createModerations(data, moderator);
      console.log(`[Moderation] ${moderator.name} ${res.updated} missions updated`);
      console.log(`[Moderation] ${moderator.name} ${res.events} events created`);

      await postMessage(
        {
          title: `Moderation ${moderator.name} completed`,
          text: `Mission updated: ${res.updated}, Events created: ${res.events}, Missions refused: ${res.refused}, Missions pending: ${res.pending}`,
        },
        SLACK_CRON_CHANNEL_ID
      );
    }
    console.log(
      `[Moderation] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`
    );
  } catch (err) {
    captureException(err);
  }
};

export default { handler };
