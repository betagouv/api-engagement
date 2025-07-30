import MissionModel from "../../models/mission";
import { Mission, Publisher } from "../../types";
import { ModerationUpdate } from "./types";

export const findMissions = async (moderator: Publisher) => {
  const publishers = moderator.publishers.map((p) => p.publisherId);
  const where = {
    publisherId: { $in: publishers },
    statusCode: "ACCEPTED",
    deleted: false,
    $or: [{ [`moderation_${moderator._id}_status`]: { $exists: false } }, { [`moderation_${moderator._id}_status`]: null }, { [`moderation_${moderator._id}_status`]: "PENDING" }],
  };
  const missions = await MissionModel.find(where).sort({ createdAt: "desc" });
  return missions;
};

export const hasModerationChanges = (m: Mission, moderator: Publisher, update: ModerationUpdate) => {
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

export const createModerations = async (missions: Mission[], moderator: Publisher) => {
  const missionBulk = [] as any[];
  const eventBulk = [] as any[];

  let refused = 0;
  let pending = 0;
  for (const mission of missions) {
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

    const createdAt = new Date(mission.createdAt);
    const startAt = new Date(mission.startAt);
    const endAt = mission.endAt ? new Date(mission.endAt) : null;

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
    } else if (mission.description.length < 300) {
      update.status = "REFUSED";
      update.comment = "CONTENT_INSUFFICIENT";
      update.date = new Date();
    } else if (!mission.city) {
      update.status = "REFUSED";
      update.comment = "CONTENT_INSUFFICIENT";
      update.date = new Date();
    }

    if (!hasModerationChanges(mission, moderator, update)) {
      continue;
    }

    eventBulk.push({
      insertOne: {
        document: {
          missionId: mission._id,
          moderatorId: moderator._id,
          userId: null,
          userName: "Modération automatique",
          initialStatus: mission[`moderation_${moderator._id}_status`] || null,
          newStatus: update.status,
          initialComment: mission[`moderation_${moderator._id}_comment`] || null,
          newComment: update.comment,
          initialNote: mission[`moderation_${moderator._id}_note`] || null,
          newNote:
            update.status === "REFUSED"
              ? `Data de la mission refusée: date de création=${createdAt.toLocaleDateString("fr")}, date de début=${startAt.toLocaleDateString("fr")}, date defin=${endAt ? endAt.toLocaleDateString("fr") : "non renseigné"}, nombre caractères description=${mission.description.length}, ville=${mission.city}`
              : "",
        },
      },
    });
    missionBulk.push({
      updateOne: {
        filter: { _id: mission._id },
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

  console.log(`[Moderation JVA] Bulk update ${missionBulk.length} missions, ${eventBulk.length} events`);
  // const resMission = await MissionModel.bulkWrite(missionBulk);
  // const resEvent = await ModerationEventModel.bulkWrite(eventBulk);
  // return { updated: resMission.modifiedCount, events: resEvent.insertedCount, refused, pending };
  return { updated: 0, events: 0, refused, pending };
};
