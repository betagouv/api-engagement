import { API_URL, PLATEFORM_URL } from "@/config";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { userScoringRepository } from "@/repositories/user-scoring";
import { sendTemplate, subscribeToNewsletter, TEMPLATE_IDS } from "@/services/brevo";
import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";
import type { MissionMatchingResultItem } from "@/services/matching-engine/types";
import { missionService } from "@/services/mission";
import {
  buildMissionBrowseTags,
  buildMissionMatchTags,
  getDomainLabel,
  type MissionCardInfo,
  type MissionEmailSkipReason,
  type SendMissionEmailRequest,
  type SignupSource,
} from "@engagement/dto";
import { getMissionCardTag, TAXONOMY } from "@engagement/taxonomy";

import { buildAnswersContentHtml, buildListMissionCardsParams, buildSavedMissionContentHtml, type MissionContent } from "./mission-content";

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
        // Scores par taxonomie du snapshot : ils ordonnent les tags de matching des cartes, comme sur la page résultats.
        taxonomyScores: "taxonomyScores" in item && typeof item.taxonomyScores === "object" && item.taxonomyScores !== null ? item.taxonomyScores : {},
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

const toMissionCardInfo = (mission: EmailMission): MissionCardInfo => ({
  remote: mission.remote ?? null,
  city: mission.city ?? null,
  schedule: mission.schedule ?? null,
  compensation: { amount: mission.compensationAmount ?? null, amountMax: mission.compensationAmountMax ?? null, unit: mission.compensationUnit ?? null },
});

const buildMissionEmailItem = (mission: EmailMission, tags: string[], url: string): MissionContent => ({
  id: mission.id,
  title: mission.title,
  imageUrl: mission.domainLogo || mission.organizationLogo || mission.publisherLogo || "",
  domainLabel: getDomainLabel(mission.domain ?? null) ?? "",
  tags,
  publisherLogo: mission.publisherLogo ?? "",
  publisherName: mission.publisherName ?? "",
  url,
});

// Mêmes tags que la page résultats (buildMissionMatchTags). Le snapshot ne garde pas le score géo : la ville n'y
// remonte donc que par les tags standards, quand le matching produit moins de 5 tags.
const buildMissionMatchingEmailParams = async (
  userScoringId: string,
  publisherId: string,
  userValueKeys: ReadonlySet<string>,
  signupSource?: SignupSource
): Promise<MissionContent[] | null> => {
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
  const emailItems: MissionContent[] = [];
  for (const matchingItem of matchingItems) {
    const matchedMission = missionsByScoringId.get(matchingItem.missionScoringId);
    if (!matchedMission) {
      continue;
    }
    const { mission, values } = matchedMission;
    const match = { taxonomyScores: matchingItem.taxonomyScores as Record<string, number>, values, geoScore: null };
    const tags = buildMissionMatchTags(match, toMissionCardInfo(mission), userValueKeys, getMissionCardTag);
    emailItems.push(buildMissionEmailItem(mission, tags, buildMissionEmailUrl(mission.id, publisherId, userScoringId, signupSource)));
  }

  return emailItems.length > 0 ? emailItems : null;
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

  // Hors matching (mission sauvegardée, sélection depuis une landing) : lieu, rythme et indemnité, comme sur le site.
  return orderedMissions.map((mission) =>
    buildMissionEmailItem(mission, buildMissionBrowseTags(toMissionCardInfo(mission)), buildMissionEmailUrl(mission.id, publisherId, userScoringId, signupSource))
  );
};

export const buildMissionEmailParams = async (params: {
  publisherId: string;
  userScoringId?: string;
  missionIds?: string[];
  signupSource?: SignupSource;
  userValueKeys?: ReadonlySet<string>;
}): Promise<MissionContent[] | null> => {
  if (params.missionIds?.length) {
    return buildMissionIdsEmailParams(params.missionIds, params.publisherId, params.userScoringId, params.signupSource);
  }

  if (!params.userScoringId) {
    return null;
  }
  return buildMissionMatchingEmailParams(params.userScoringId, params.publisherId, params.userValueKeys ?? new Set(), params.signupSource);
};

// Questions du quiz rappelées dans « Tu nous as dit », dans l'ordre du parcours.
const EMAIL_ANSWER_TAXONOMIES = ["motivation_recherche", "rythme", "domaine_engagement", "activite"] as const;

// Une puce pour l'adresse recherchée, puis une puce par question avec les libellés choisis, dans l'ordre de la taxonomie.
export const buildQuizAnswers = (address: string | null, values: Array<{ taxonomyKey: string | null; valueKey: string | null }>) => {
  const answers = address ? [`Rechercher des missions à ${address}`] : [];
  for (const taxonomyKey of EMAIL_ANSWER_TAXONOMIES) {
    const selectedValueKeys = new Set(values.filter((value) => value.taxonomyKey === taxonomyKey).map((value) => value.valueKey));
    const taxonomyValues = Object.entries(TAXONOMY[taxonomyKey].values as Record<string, { label: string }>);
    const labels = taxonomyValues.filter(([valueKey]) => selectedValueKeys.has(valueKey)).map(([, value]) => `“${value.label}”`);
    if (labels.length > 0) {
      answers.push(labels.join(", "));
    }
  }
  return answers;
};

export const getMissionEmailSkipReason = (missionIds?: string[]): MissionEmailSkipReason => {
  return missionIds?.length ? MISSION_EMAIL_SKIP_REASONS.MISSION_NOT_FOUND : MISSION_EMAIL_SKIP_REASONS.NO_MATCHING_RESULT;
};

export const sendMissionEmail = async (input: SendMissionEmailRequest): Promise<SendMissionEmailResult> => {
  let missionAlertEnabled = false;
  if (input.userScoringId) {
    const userScoring = await userScoringRepository.findById(input.userScoringId);
    if (!userScoring) {
      return { status: "not_found" };
    }

    if (!input.distinctId || !userScoring.distinctId || userScoring.distinctId !== input.distinctId) {
      return { status: "forbidden" };
    }
    missionAlertEnabled = userScoring.missionAlertEnabled;
  }

  // Inscription Brevo depuis le quiz (scoring) ou depuis un point d'entrée identifié, même sans scoring
  // (ex. cœur d'une carte sur une landing).
  if (input.userScoringId || input.signupSource) {
    const contactResult = await subscribeToNewsletter({
      email: input.email,
      publisherId: input.publisherId,
      distinctId: input.distinctId,
      userScoringId: input.userScoringId,
      missionAlertEnabled,
      signupSource: input.signupSource,
    });

    if (!contactResult.ok) {
      return { status: "failed" };
    }
  }

  // Sans scoring (envoi depuis une landing), pas de réponses à rappeler, de ville ni de tags de matching.
  const emailContext = input.userScoringId ? await userScoringRepository.findEmailContext(input.userScoringId) : null;
  const scoringValues = emailContext?.values ?? [];

  const missions = await buildMissionEmailParams({
    publisherId: input.publisherId,
    userScoringId: input.userScoringId,
    missionIds: input.missionIds,
    signupSource: input.signupSource,
    userValueKeys: new Set(scoringValues.map((value) => `${value.taxonomyKey}.${value.valueKey}`)),
  });

  if (!missions) {
    return { status: "skipped", reason: getMissionEmailSkipReason(input.missionIds) };
  }

  // Une seule mission demandée (cœur d'une carte, fiche mission) : grande carte, et le CTA « Découvrir la mission »
  // du template pointe vers la mission. Sinon : la sélection de résultats en grille.
  if (input.missionIds?.length === 1) {
    const [mission] = missions;
    const savedResult = await sendTemplate(TEMPLATE_IDS.TTM_MISSION_SAVED, {
      emailTo: [input.email],
      params: {
        contentHtml: buildSavedMissionContentHtml(mission),
        missionUrl: mission.url,
        missionTitle: mission.title,
        publisherName: mission.publisherName,
      },
      tags: ["mission-saved"],
    });
    return savedResult.ok ? { status: "sent" } : { status: "failed" };
  }

  // Les scorings antérieurs à la colonne `answers` n'ont que les valeurs de scoring (sans les réponses neutres).
  const answeredValues = Array.isArray(emailContext?.answers) ? (emailContext.answers as Array<{ taxonomyKey: string; valueKey: string }>) : scoringValues;
  const answers = buildQuizAnswers(emailContext?.geo?.address ?? null, answeredValues);
  const emailResult = await sendTemplate(TEMPLATE_IDS.TTM_MISSIONS_LISTING, {
    emailTo: [input.email],
    params: {
      ...buildListMissionCardsParams(missions),
      answersHtml: buildAnswersContentHtml(answers),
      city: emailContext?.geo?.city ?? "",
      missionCount: missions.length,
      resultUrl: buildResultsUrl(input.userScoringId, input.signupSource),
    },
    tags: ["user-scoring", "mission-matching-results"],
  });

  if (!emailResult.ok) {
    return { status: "failed" };
  }

  return { status: "sent" };
};
