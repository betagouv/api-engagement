import { API_URL } from "@/config";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { userScoringRepository } from "@/repositories/user-scoring";
import type { MissionContent } from "@/services/brevo";
import { buildMissionContentHtml, createOrUpdateContact, sendTemplate, TEMPLATE_IDS } from "@/services/brevo";
import type { MissionMatchingResultItem } from "@/services/matching-engine/types";
import { missionService } from "@/services/mission";
import type { MissionEmailSkipReason, SendMissionEmailRequest } from "@engagement/dto";

const BREVO_CONTACT_LIST_ID = 22;
const USER_SCORING_EMAIL_MISSION_LIMIT = 5;

export const MISSION_EMAIL_SKIP_REASONS = {
  NO_MATCHING_RESULT: "NO_MATCHING_RESULT",
  MISSION_NOT_FOUND: "MISSION_NOT_FOUND",
} as const satisfies Record<MissionEmailSkipReason, MissionEmailSkipReason>;

type EmailMission = {
  id: string;
  title: string;
  duration?: number | null;
  startAt?: Date | null;
  endAt?: Date | null;
  compensationAmount?: number | null;
  compensationAmountMax?: number | null;
  compensationUnit?: string | null;
  domainLogo?: string | null;
  publisherLogo?: string | null;
  publisherName?: string | null;
  publisherOrganizationName?: string | null;
  organizationName?: string | null;
  city?: string | null;
};

type SendMissionEmailResult = { status: "sent" } | { status: "skipped"; reason: MissionEmailSkipReason } | { status: "failed" } | { status: "forbidden" } | { status: "not_found" };

const extractMissionMatchingResultItems = (results: unknown): MissionMatchingResultItem[] => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item): MissionMatchingResultItem | null => {
      if (typeof item !== "object" || item === null || !("missionScoringId" in item) || typeof item.missionScoringId !== "string" || item.missionScoringId.length === 0) {
        return null;
      }

      return {
        missionScoringId: item.missionScoringId,
        missionAddressId: "missionAddressId" in item && typeof item.missionAddressId === "string" ? item.missionAddressId : null,
        taxonomyScores: {},
      };
    })
    .filter((item): item is MissionMatchingResultItem => item !== null)
    .slice(0, USER_SCORING_EMAIL_MISSION_LIMIT);
};

const buildMissionEmailUrl = (missionId: string, publisherId: string, userScoringId?: string) => {
  const url = new URL(`/r/email/${encodeURIComponent(missionId)}/${encodeURIComponent(publisherId)}`, API_URL);
  if (userScoringId) {
    url.searchParams.set("user_scoring_id", userScoringId);
  }
  return url.toString();
};

const formatFrenchDayMonth = (date: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(date);

const formatDurationLabel = (duration?: number | null) => {
  if (!duration) {
    return "";
  }
  return `${duration} mois`;
};

const formatStartAtLabel = (startAt?: Date | null) => {
  if (!startAt) {
    return "";
  }
  return `à partir du ${formatFrenchDayMonth(startAt)}`;
};

const formatCompensationAmount = (amount: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(amount)}€`;

const formatCompensationLabel = (mission: EmailMission) => {
  if (typeof mission.compensationAmount !== "number" || !mission.compensationUnit) {
    return "";
  }

  const unitLabels: Record<string, string> = {
    hour: "heure",
    day: "jour",
    month: "mois",
    year: "an",
  };
  const unitLabel = unitLabels[mission.compensationUnit] ?? mission.compensationUnit;
  const amountLabel =
    typeof mission.compensationAmountMax === "number" && mission.compensationAmountMax > mission.compensationAmount
      ? `${formatCompensationAmount(mission.compensationAmount)} à ${formatCompensationAmount(mission.compensationAmountMax)}`
      : formatCompensationAmount(mission.compensationAmount);

  return `${amountLabel} par ${unitLabel}`;
};

const buildMissionEmailItem = (mission: EmailMission, publisherId: string, userScoringId?: string): MissionContent => ({
  title: mission.title,
  imageUrl: mission.domainLogo ?? "",
  durationLabel: formatDurationLabel(mission.duration),
  startAtLabel: formatStartAtLabel(mission.startAt),
  compensationLabel: formatCompensationLabel(mission),
  publisherLogo: mission.publisherLogo ?? "",
  publisherName: mission.publisherName ?? "",
  publisherOrganizationName: mission.publisherOrganizationName ?? mission.organizationName ?? "",
  city: mission.city ?? "",
  url: buildMissionEmailUrl(mission.id, publisherId, userScoringId),
});

const buildMissionMatchingEmailParams = async (userScoringId: string, publisherId: string): Promise<MissionContent[] | null> => {
  const matchingResult = await missionMatchingResultRepository.findLatestForUserScoring(userScoringId);
  if (!matchingResult) {
    return null;
  }

  const matchingItems = extractMissionMatchingResultItems(matchingResult.results);
  if (matchingItems.length === 0) {
    return null;
  }

  const missions = await missionMatchingResultRepository.findMissionsByMatchingResultItems(matchingItems);
  const missionsByScoringId = new Map(missions.map((item) => [item.missionScoringId, item]));
  const orderedMissions = matchingItems.map((item) => missionsByScoringId.get(item.missionScoringId)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (orderedMissions.length === 0) {
    return null;
  }

  return orderedMissions.map(({ mission }) => buildMissionEmailItem(mission, publisherId, userScoringId));
};

const normalizeMissionIds = (missionIds: string[]) => {
  return Array.from(new Set(missionIds)).slice(0, USER_SCORING_EMAIL_MISSION_LIMIT);
};

const buildMissionIdsEmailParams = async (missionIds: string[], publisherId: string, userScoringId?: string): Promise<MissionContent[] | null> => {
  const uniqueMissionIds = normalizeMissionIds(missionIds);
  const missions = await missionService.findMissionsByIds(uniqueMissionIds);
  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));
  const orderedMissions = uniqueMissionIds.map((missionId) => missionsById.get(missionId)).filter((mission): mission is NonNullable<typeof mission> => Boolean(mission));

  if (orderedMissions.length === 0) {
    return null;
  }

  return orderedMissions.map((mission) => buildMissionEmailItem(mission, publisherId, userScoringId));
};

export const buildMissionEmailParams = async (params: { publisherId: string; userScoringId?: string; missionIds?: string[] }): Promise<MissionContent[] | null> => {
  if (params.missionIds?.length) {
    return buildMissionIdsEmailParams(params.missionIds, params.publisherId, params.userScoringId);
  }

  if (!params.userScoringId) {
    return null;
  }
  return buildMissionMatchingEmailParams(params.userScoringId, params.publisherId);
};

export const getMissionEmailSkipReason = (missionIds?: string[]): MissionEmailSkipReason => {
  return missionIds?.length ? MISSION_EMAIL_SKIP_REASONS.MISSION_NOT_FOUND : MISSION_EMAIL_SKIP_REASONS.NO_MATCHING_RESULT;
};

export const sendMissionEmail = async (input: SendMissionEmailRequest): Promise<SendMissionEmailResult> => {
  if (input.userScoringId) {
    const userScoring = await userScoringRepository.findById(input.userScoringId);
    if (!userScoring) {
      return { status: "not_found" };
    }

    if (!input.distinctId || !userScoring.distinctId || userScoring.distinctId !== input.distinctId) {
      return { status: "forbidden" };
    }

    const contactResult = await createOrUpdateContact({
      email: input.email,
      distinctId: input.distinctId,
      userScoringId: input.userScoringId,
      missionAlertEnabled: userScoring.missionAlertEnabled,
      listId: BREVO_CONTACT_LIST_ID,
    });

    if (!contactResult.ok) {
      return { status: "failed" };
    }
  }

  const missions = await buildMissionEmailParams({
    publisherId: input.publisherId,
    userScoringId: input.userScoringId,
    missionIds: input.missionIds,
  });

  if (!missions) {
    return { status: "skipped", reason: getMissionEmailSkipReason(input.missionIds) };
  }

  const emailResult = await sendTemplate(TEMPLATE_IDS.MISSION_MATCHING_RESULTS, {
    emailTo: [input.email],
    params: { contentHtml: buildMissionContentHtml(missions) },
    tags: ["user-scoring", "mission-matching-results"],
  });

  if (!emailResult.ok) {
    return { status: "failed" };
  }

  return { status: "sent" };
};
