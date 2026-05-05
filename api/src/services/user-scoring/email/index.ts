import { API_URL } from "@/config";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { missionService } from "@/services/mission";

const USER_SCORING_EMAIL_MISSION_LIMIT = 5;

export const MISSION_EMAIL_SKIP_REASONS = {
  NO_MATCHING_RESULT: "NO_MATCHING_RESULT",
  MISSION_NOT_FOUND: "MISSION_NOT_FOUND",
} as const;

export type MissionEmailSkipReason = (typeof MISSION_EMAIL_SKIP_REASONS)[keyof typeof MISSION_EMAIL_SKIP_REASONS];

type EmailMission = {
  id: string;
  title: string;
  duration?: number | null;
  startAt?: Date | null;
  endAt?: Date | null;
  compensationAmount?: number | null;
  compensationAmountMax?: number | null;
  compensationUnit?: string | null;
  publisherLogo?: string | null;
  publisherName?: string | null;
  publisherOrganizationName?: string | null;
  organizationName?: string | null;
  city?: string | null;
};

type MissionEmailItem = {
  title: string;
  durationLabel: string;
  startAtLabel: string;
  compensationLabel: string;
  applicationDeadlineLabel: string;
  publisherLogo: string;
  publisherName: string;
  publisherOrganizationName: string;
  city: string;
  url: string;
};

type MissionEmailParams = {
  missions: MissionEmailItem[];
};

const extractMissionScoringIds = (results: unknown): string[] => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => (typeof item === "object" && item !== null && "missionScoringId" in item ? item.missionScoringId : null))
    .filter((missionScoringId): missionScoringId is string => typeof missionScoringId === "string" && missionScoringId.length > 0)
    .slice(0, USER_SCORING_EMAIL_MISSION_LIMIT);
};

const buildUserScoringMissionUrl = (userScoringId: string, missionId: string) => {
  return new URL(`/r/user-scoring/${encodeURIComponent(userScoringId)}/${encodeURIComponent(missionId)}`, API_URL).toString();
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

const formatApplicationDeadlineLabel = (endAt?: Date | null) => {
  if (!endAt) {
    return "";
  }
  return `Candidatures ouvertes jusqu'au ${formatFrenchDayMonth(endAt)}`;
};

const buildMissionEmailItem = (userScoringId: string, mission: EmailMission): MissionEmailItem => ({
  title: mission.title,
  durationLabel: formatDurationLabel(mission.duration),
  startAtLabel: formatStartAtLabel(mission.startAt),
  compensationLabel: formatCompensationLabel(mission),
  applicationDeadlineLabel: formatApplicationDeadlineLabel(mission.endAt),
  publisherLogo: mission.publisherLogo ?? "",
  publisherName: mission.publisherName ?? "",
  publisherOrganizationName: mission.publisherOrganizationName ?? mission.organizationName ?? "",
  city: mission.city ?? "",
  url: buildUserScoringMissionUrl(userScoringId, mission.id),
});

const buildMissionMatchingEmailParams = async (userScoringId: string): Promise<MissionEmailParams | null> => {
  const matchingResult = await missionMatchingResultRepository.findLatestForUserScoring(userScoringId);
  if (!matchingResult) {
    return null;
  }

  const missionScoringIds = extractMissionScoringIds(matchingResult.results);
  if (missionScoringIds.length === 0) {
    return null;
  }

  const missions = await missionMatchingResultRepository.findMissionsByScoringIds(missionScoringIds);
  const missionsByScoringId = new Map(missions.map((item) => [item.missionScoringId, item]));
  const orderedMissions = missionScoringIds.map((missionScoringId) => missionsByScoringId.get(missionScoringId)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (orderedMissions.length === 0) {
    return null;
  }

  return {
    missions: orderedMissions.map(({ mission }) => buildMissionEmailItem(userScoringId, mission)),
  };
};

const buildSingleMissionEmailParams = async (userScoringId: string, missionId: string): Promise<MissionEmailParams | null> => {
  const mission = await missionService.findOneMission(missionId);
  if (!mission) {
    return null;
  }

  return {
    missions: [buildMissionEmailItem(userScoringId, mission)],
  };
};

export const buildMissionEmailParams = async (params: { userScoringId: string; missionId?: string }): Promise<MissionEmailParams | null> => {
  if (params.missionId) {
    return buildSingleMissionEmailParams(params.userScoringId, params.missionId);
  }

  return buildMissionMatchingEmailParams(params.userScoringId);
};

export const getMissionEmailSkipReason = (missionId?: string): MissionEmailSkipReason => {
  return missionId ? MISSION_EMAIL_SKIP_REASONS.MISSION_NOT_FOUND : MISSION_EMAIL_SKIP_REASONS.NO_MATCHING_RESULT;
};
