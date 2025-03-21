import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import { Mission, Publisher } from "../../types";
import MissionModel from "../../models/mission";
import ModerationEventModel from "../../models/moderation-event";

const findMissions = async (moderator: Publisher) => {
  const publishers = moderator.publishers.map((p) => p.publisher);
  const where = {
    publisherId: { $in: publishers },
    statusCode: "ACCEPTED",
    deleted: false,
    $or: [{ [`moderation_${moderator._id}_status`]: { $exists: false } }, { [`moderation_${moderator._id}_status`]: "PENDING" }],
  };
  const missions = await MissionModel.find(where).sort({ createdAt: "desc" });
  return missions;
};

const createModerations = async (missions: Mission[], moderator: Publisher) => {
  const missonBulk = [] as any[];
  const eventBulk = [] as any[];

  for (const m of missions) {
    const update = {
      [`moderation_${moderator._id}_status`]: "PENDING",
      [`moderation_${moderator._id}_comment`]: "",
      [`moderation_${moderator._id}_note`]: "",
      [`moderation_${moderator._id}_title`]: "",
      [`moderation_${moderator._id}_date`]: new Date().toISOString(),
    };

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
      update[`moderation_${moderator._id}_status`] = "REFUSED";
      update[`moderation_${moderator._id}_comment`] = "MISSION_CREATION_DATE_TOO_OLD";
      update[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (endAt && startAt < in7Days && endAt < in21Days) {
      update[`moderation_${moderator._id}_status`] = "REFUSED";
      update[`moderation_${moderator._id}_comment`] = "MISSION_DATE_NOT_COMPATIBLE";
      update[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (m.description.length < 300) {
      update[`moderation_${moderator._id}_status`] = "REFUSED";
      update[`moderation_${moderator._id}_comment`] = "CONTENT_INSUFFICIENT";
      update[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (!m.city) {
      update[`moderation_${moderator._id}_status`] = "REFUSED";
      update[`moderation_${moderator._id}_comment`] = "CONTENT_INSUFFICIENT";
      update[`moderation_${moderator._id}_date`] = new Date().toISOString();
    }

    missonBulk.push({ updateOne: { filter: { _id: m._id }, update: { $set: update } } });

    if (m[`moderation_${moderator._id}_status`]) {
      eventBulk.push({
        insertOne: {
          document: {
            missionId: m._id,
            moderatorId: moderator._id,
            userId: null,
            userName: "Modération automatique",
            initialStatus: m[`moderation_${moderator._id}_status`],
            newStatus: update[`moderation_${moderator._id}_status`],
            initialComment: m[`moderation_${moderator._id}_comment`],
            newComment: update[`moderation_${moderator._id}_comment`],
            initialNote: m[`moderation_${moderator._id}_note`],
            newNote:
              update[`moderation_${moderator._id}_status`] === "REFUSED"
                ? `Data de la mission refusée: création=${createdAt.toLocaleString("fr")}, début=${startAt.toLocaleString("fr")}, fin=${endAt ? endAt.toLocaleString("fr") : "non renseigné"}, taille description=${m.description.length}, ville=${m.city}`
                : "",
          },
        },
      });
    } else {
      eventBulk.push({
        insertOne: {
          document: {
            missionId: m._id,
            moderatorId: moderator._id,
            userId: null,
            userName: "Modération automatique",
            initialStatus: null,
            newStatus: update[`moderation_${moderator._id}_status`] || null,
            initialComment: null,
            newComment: update[`moderation_${moderator._id}_comment`] || null,
            initialNote: null,
            newNote:
              update[`moderation_${moderator._id}_status`] === "REFUSED"
                ? `Data de la mission refusée :\n - création : ${createdAt}\n - début : ${startAt}\n - fin : ${endAt || "non renseigné"}\n - taille description : ${m.description.length}\n - ville : ${m.city}`
                : null,
          },
        },
      });
      break;
    }
  }

  const res = await MissionModel.bulkWrite(missonBulk);
  const resEvent = await ModerationEventModel.bulkWrite(eventBulk);
  return { updated: res.modifiedCount, events: resEvent.insertedCount };
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Moderation] Starting at ${start.toISOString()}`);

    const moderators = await PublisherModel.find({ moderator: true });

    for (let i = 0; i < moderators.length; i++) {
      const moderator = moderators[i];

      if (!moderator.publishers || !moderator.publishers.length) continue;

      console.log(`[Moderation] Starting for ${moderator.name} (${moderator._id}), number ${i + 1}/${moderators.length}`);

      const data = await findMissions(moderator);
      console.log(`[Moderation] - ${moderator.name} ${data.length} found in pending moderation yet`);

      if (!data.length) continue;

      const res = await createModerations(data, moderator);
      console.log(`[Moderation] - ${moderator.name} ${res.updated} missions updated`);
      console.log(`[Moderation] - ${moderator.name} ${res.events} events created`);
    }
    console.log(`[Moderation] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
  } catch (err) {
    captureException(err);
  }
};

export default { handler };
