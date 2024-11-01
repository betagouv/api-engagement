import esClient from "../../db/elastic";
import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import { MISSION_INDEX } from "../../config";
import { Mission, Publisher } from "../../types";
import MissionModel from "../../models/mission";

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
  let inserted = 0;
  let updated = 0;

  const bulkBody = [] as any[];
  missions.forEach((m) => {
    const obj = {
      _id: m._id,
      [`moderation_${moderator._id}_status`]: "PENDING",
      [`moderation_${moderator._id}_comment`]: "",
      [`moderation_${moderator._id}_note`]: "",
      [`moderation_${moderator._id}_title`]: "",
      [`moderation_${moderator._id}_date`]: new Date().toISOString(),
    };

    if (m[`moderation_${moderator._id}_status`]) updated++;
    else inserted++;

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
      obj[`moderation_${moderator._id}_status`] = "REFUSED";
      obj[`moderation_${moderator._id}_comment`] = "La mission est refusée car la date de création est trop ancienne (> 6 mois)";
      obj[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (endAt && startAt < in7Days && endAt < in21Days) {
      obj[`moderation_${moderator._id}_status`] = "REFUSED";
      obj[`moderation_${moderator._id}_comment`] = "La date de la mission n’est pas compatible avec le recrutement de bénévoles";
      obj[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (m.description.length < 300) {
      obj[`moderation_${moderator._id}_status`] = "REFUSED";
      obj[`moderation_${moderator._id}_comment`] = "Le contenu est insuffisant / non qualitatif";
      obj[`moderation_${moderator._id}_date`] = new Date().toISOString();
    } else if (!m.city) {
      obj[`moderation_${moderator._id}_status`] = "REFUSED";
      obj[`moderation_${moderator._id}_comment`] = "Le contenu est insuffisant / non qualitatif";
      obj[`moderation_${moderator._id}_date`] = new Date().toISOString();
    }

    bulkBody.push(obj);
  });

  // MongoDB bulk update
  await MissionModel.bulkWrite(bulkBody.map((b) => ({ updateOne: { filter: { _id: b._id }, update: { $set: { ...b, _id: undefined } } } })));
  const resEs = await esClient.bulk({ refresh: true, body: bulkBody.flatMap((b) => [{ update: { _index: MISSION_INDEX, _id: b._id } }, { doc: { ...b, _id: undefined } }]) });

  if (resEs.body.errors) {
    resEs.body.items
      .filter((e: any) => e.update && e.update.error)
      .forEach((e: any) => {
        console.log("error", e.update.error);
      });
  }
  return { inserted, updated };
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
      console.log(`[Moderation] - ${moderator.name} ${res.updated} moderation updated`);
      console.log(`[Moderation] - ${moderator.name} ${res.inserted} moderation created`);
    }
    console.log(`[Moderation] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
  } catch (err) {
    captureException(err);
  }
};

export default { handler };
