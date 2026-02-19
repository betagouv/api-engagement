import { Prisma } from "../../db/core";
import { missionService } from "../../services/mission";
import { missionModerationStatusService } from "../../services/mission-moderation-status";
import { moderationEventService } from "../../services/moderation-event";
import { MissionRecord, MissionSelect } from "../../types/mission";
import { ModerationEventCreateInput, ModerationEventStatus } from "../../types/moderation-event";
import type { PublisherRecord } from "../../types/publisher";
import { ModerationUpdate } from "./types";

const MISSION_SELECT: MissionSelect = {
  id: true,
  createdAt: true,
  startAt: true,
  endAt: true,
  description: true,
  addresses: { select: { city: true } },
  moderationStatuses: { select: { status: true, comment: true, note: true, publisherId: true } },
};

export const findMissions = async (moderator: PublisherRecord) => {
  const publishers = moderator.publishers.map((p) => p.diffuseurPublisherId);
  return missionService.findMissionsBy(
    {
      publisherId: { in: publishers },
      statusCode: "ACCEPTED",
      deletedAt: null,
      OR: [{ moderationStatuses: { none: { publisherId: moderator.id } } }, { moderationStatuses: { some: { publisherId: moderator.id, status: "PENDING" } } }],
    },
    { orderBy: { createdAt: Prisma.SortOrder.desc }, select: MISSION_SELECT }
  );
};

export const hasModerationChanges = (m: MissionRecord, moderator: PublisherRecord, update: ModerationUpdate) => {
  if (!m[`moderation_${moderator.id}_status`]) {
    return true;
  }
  if ((m[`moderation_${moderator.id}_status`] || null) !== update.status) {
    return true;
  }
  if ((m[`moderation_${moderator.id}_comment`] || null) !== update.comment) {
    return true;
  }
  if ((m[`moderation_${moderator.id}_note`] || null) !== update.note) {
    return true;
  }
  return false;
};

export const createModerations = async (missions: MissionRecord[], moderator: PublisherRecord) => {
  const moderationUpserts: Array<{
    missionId: string;
    publisherId: string;
    status: ModerationEventStatus | null;
    comment: string | null;
    note: string | null;
  }> = [];
  const eventBulk: ModerationEventCreateInput[] = [];

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
    const startAt = mission.startAt ? new Date(mission.startAt) : null;
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
    } else if (endAt && startAt && startAt < in7Days && endAt < in21Days) {
      update.status = "REFUSED";
      update.comment = "MISSION_DATE_NOT_COMPATIBLE";
      update.date = new Date();
    } else if (mission.description && mission.description.length < 300) {
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

    const initialStatus = (mission[`moderation_${moderator._id}_status`] ?? null) as ModerationEventStatus | null;

    eventBulk.push({
      missionId: mission.id,
      moderatorId: moderator.id,
      userId: null,
      userName: "Modération automatique",
      initialStatus,
      newStatus: update.status,
      initialComment: mission[`moderation_${moderator.id}_comment`] || null,
      newComment: update.comment,
      initialNote: mission[`moderation_${moderator.id}_note`] || null,
      newNote:
        update.status === "REFUSED"
          ? `Data de la mission refusée: date de création=${createdAt.toLocaleDateString("fr")}, date de début=${startAt?.toLocaleDateString("fr")}, date defin=${endAt ? endAt.toLocaleDateString("fr") : "non renseigné"}, nombre caractères description=${mission.description?.length}, ville=${mission.city}`
          : "",
    });

    moderationUpserts.push({
      missionId: mission.id,
      publisherId: moderator.id,
      status: update.status,
      comment: update.comment,
      note: update.note,
    });

    if (update.status === "REFUSED") {
      refused++;
    }
    if (update.status === "PENDING") {
      pending++;
    }
  }

  console.log(`[Moderation JVA] Bulk update ${moderationUpserts.length} missions, ${eventBulk.length} events`);
  const resMission = await missionModerationStatusService.upsertStatuses(moderationUpserts);
  const eventsCount = await moderationEventService.createModerationEvents(eventBulk);
  const updatedCount = resMission.filter((item) => new Date(item.createdAt).getTime() !== new Date(item.updatedAt).getTime()).length;
  return { updated: updatedCount, created: resMission.length - updatedCount, events: eventsCount, refused, pending };
};
