import { API_URL, PLATEFORM_URL } from "@/config";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { userScoringRepository } from "@/repositories/user-scoring";
import { sendTemplate, subscribeToNewsletter, TEMPLATE_IDS } from "@/services/brevo";
import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";
import type { MissionMatchingResultItem } from "@/services/matching-engine/types";
import { missionService } from "@/services/mission";
import { getDomainLabel, type MissionEmailSkipReason, type SendMissionEmailRequest, type SignupSource } from "@engagement/dto";

import { buildMissionContentHtml, type MissionContent } from "./mission-content";

const USER_SCORING_EMAIL_MISSION_LIMIT = 6;

export const MISSION_EMAIL_SKIP_REASONS = {
  NO_MATCHING_RESULT: "NO_MATCHING_RESULT",
  MISSION_NOT_FOUND: "MISSION_NOT_FOUND",
} as const satisfies Record<MissionEmailSkipReason, MissionEmailSkipReason>;

type EmailMission = {
  id: string;
  title: string;
  compensationAmount?: number | null;
  compensationAmountMax?: number | null;
  compensationUnit?: string | null;
  remote?: string | null;
  schedule?: string | null;
  domain?: string | null;
  domainLogo?: string | null;
  organizationLogo?: string | null;
  publisherLogo?: string | null;
  publisherName?: string | null;
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

const buildMissionEmailUrl = (missionId: string, publisherId: string, userScoringId?: string, signupSource?: SignupSource) => {
  const url = new URL(`/r/email/${encodeURIComponent(missionId)}/${encodeURIComponent(publisherId)}`, API_URL);
  if (userScoringId) {
    url.searchParams.set("user_scoring_id", userScoringId);
  }
  if (signupSource) {
    url.searchParams.set("email_source", signupSource);
  }
  return url.toString();
};

// Lien « voir mes résultats » : les UTM sont repris par le tracking de la plateforme (PostHog), ce qui mesure les clics depuis l'email.
// Sans scoring (envoi d'une mission depuis une landing), on renvoie vers la liste des missions.
const buildResultsUrl = (userScoringId: string | undefined, signupSource?: SignupSource) => {
  const url = new URL(userScoringId ? `/results/${userScoringId}` : "/missions", PLATEFORM_URL);
  if (signupSource) {
    url.searchParams.set("utm_source", "brevo");
    url.searchParams.set("utm_medium", "email");
    url.searchParams.set("utm_campaign", `${signupSource}_missions`);
  }
  return url.toString();
};

const COMPENSATION_UNIT_LABELS: Record<string, string> = {
  hour: "heure",
  day: "jour",
  week: "semaine",
  month: "mois",
  year: "an",
};

// Même libellé que la plateforme (formatCompensation dans plateform/app/utils/mission.ts).
const formatCompensationLabel = (mission: EmailMission) => {
  if (typeof mission.compensationAmount !== "number") {
    return null;
  }
  const amount =
    typeof mission.compensationAmountMax === "number"
      ? mission.compensationAmount === 0
        ? `Jusqu'à ${mission.compensationAmountMax}€`
        : `Entre ${mission.compensationAmount} et ${mission.compensationAmountMax}€`
      : `${mission.compensationAmount}€`;
  if (!mission.compensationUnit) {
    return amount;
  }
  return `${amount} par ${COMPENSATION_UNIT_LABELS[mission.compensationUnit] ?? mission.compensationUnit}`;
};

// Mêmes tags que les cartes de la plateforme hors matching (buildMissionBrowseTags) : lieu, rythme et indemnité.
const buildMissionTags = (mission: EmailMission) => {
  const location = mission.remote === "local" ? "Près de chez moi" : mission.remote === "full" ? "À distance" : mission.city;
  return [location, mission.schedule, formatCompensationLabel(mission)].filter((tag): tag is string => Boolean(tag));
};

const buildMissionEmailItem = (mission: EmailMission, publisherId: string, userScoringId?: string, signupSource?: SignupSource): MissionContent => ({
  id: mission.id,
  title: mission.title,
  imageUrl: mission.domainLogo || mission.organizationLogo || mission.publisherLogo || "",
  domainLabel: getDomainLabel(mission.domain ?? null) ?? "",
  tags: buildMissionTags(mission),
  publisherLogo: mission.publisherLogo ?? "",
  publisherName: mission.publisherName ?? "",
  url: buildMissionEmailUrl(mission.id, publisherId, userScoringId, signupSource),
});

const buildMissionMatchingEmailParams = async (userScoringId: string, publisherId: string, signupSource?: SignupSource): Promise<MissionContent[] | null> => {
  // Même version figée que la page résultats : un ancien scoring n'a que son ancien snapshot (ex. m1),
  // pas celui de la version courante. Lire CURRENT renverrait null → email jamais envoyé.
  const version = (await missionMatchingResultRepository.findEarliestVersion(userScoringId)) ?? CURRENT_MATCHING_ENGINE_VERSION;
  const matchingResult = await missionMatchingResultRepository.findLatestForUserScoringVersion(userScoringId, version);
  if (!matchingResult) {
    return null;
  }

  const matchingItems = extractMissionMatchingResultItems(matchingResult.results);
  if (matchingItems.length === 0) {
    return null;
  }

  // Cette version ignore-t-elle l'adresse des missions remote=full/local ? (aligné sur le moteur / l'API)
  const ignoreRemoteAddress = MATCHING_ENGINE_VERSIONS[version].remoteFullGeoScore != null || MATCHING_ENGINE_VERSIONS[version].remoteLocalGeoScore != null;
  const missions = await missionMatchingResultRepository.findMissionsByMatchingResultItems(matchingItems, ignoreRemoteAddress);
  const missionsByScoringId = new Map(missions.map((item) => [item.missionScoringId, item]));
  const orderedMissions = matchingItems.map((item) => missionsByScoringId.get(item.missionScoringId)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (orderedMissions.length === 0) {
    return null;
  }

  return orderedMissions.map(({ mission }) => buildMissionEmailItem(mission, publisherId, userScoringId, signupSource));
};

const normalizeMissionIds = (missionIds: string[]) => {
  return Array.from(new Set(missionIds)).slice(0, USER_SCORING_EMAIL_MISSION_LIMIT);
};

const buildMissionIdsEmailParams = async (missionIds: string[], publisherId: string, userScoringId?: string, signupSource?: SignupSource): Promise<MissionContent[] | null> => {
  const uniqueMissionIds = normalizeMissionIds(missionIds);
  const missions = await missionService.findMissionsByIds(uniqueMissionIds);
  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));
  const orderedMissions = uniqueMissionIds.map((missionId) => missionsById.get(missionId)).filter((mission): mission is NonNullable<typeof mission> => Boolean(mission));

  if (orderedMissions.length === 0) {
    return null;
  }

  return orderedMissions.map((mission) => buildMissionEmailItem(mission, publisherId, userScoringId, signupSource));
};

export const buildMissionEmailParams = async (params: {
  publisherId: string;
  userScoringId?: string;
  missionIds?: string[];
  signupSource?: SignupSource;
}): Promise<MissionContent[] | null> => {
  if (params.missionIds?.length) {
    return buildMissionIdsEmailParams(params.missionIds, params.publisherId, params.userScoringId, params.signupSource);
  }

  if (!params.userScoringId) {
    return null;
  }
  return buildMissionMatchingEmailParams(params.userScoringId, params.publisherId, params.signupSource);
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

    const contactResult = await subscribeToNewsletter({
      email: input.email,
      publisherId: input.publisherId,
      distinctId: input.distinctId,
      userScoringId: input.userScoringId,
      missionAlertEnabled: userScoring.missionAlertEnabled,
      signupSource: input.signupSource,
    });

    if (!contactResult.ok) {
      return { status: "failed" };
    }
  }

  const missions = await buildMissionEmailParams({
    publisherId: input.publisherId,
    userScoringId: input.userScoringId,
    missionIds: input.missionIds,
    signupSource: input.signupSource,
  });

  if (!missions) {
    return { status: "skipped", reason: getMissionEmailSkipReason(input.missionIds) };
  }

  const emailResult = await sendTemplate(TEMPLATE_IDS.TTM_MISSIONS_LISTING, {
    emailTo: [input.email],
    params: {
      contentHtml: buildMissionContentHtml(missions),
      resultUrl: buildResultsUrl(input.userScoringId, input.signupSource),
    },
    tags: ["user-scoring", "mission-matching-results"],
  });

  if (!emailResult.ok) {
    return { status: "failed" };
  }

  return { status: "sent" };
};
