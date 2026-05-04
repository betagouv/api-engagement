import { parseTaxonomyValueKey } from "@engagement/taxonomy";

import { userScoringRepository } from "@/repositories/user-scoring";
import { createOrUpdateContact, sendTemplate, TEMPLATE_IDS } from "@/services/brevo";
import { buildMissionEmailParams, getMissionEmailSkipReason, type MissionEmailSkipReason } from "@/services/user-scoring/email";

const BREVO_CONTACT_LIST_ID = 22;
const USER_SCORING_TTL_DAYS = 7;

interface CreateUserScoringInput {
  answers: Array<{ taxonomy_value_key: string }>;
  geo?: {
    lat: number;
    lon: number;
    radius_km?: number;
  };
  distinctId?: string;
  missionAlertEnabled: boolean;
}

interface UpdateUserScoringInput {
  userScoringId: string;
  distinctId: string;
  answers?: Array<{ taxonomy_value_key: string }>;
  missionAlertEnabled?: boolean;
  email?: string;
  missionId?: string;
}

const buildValuesToPersist = (answers: Array<{ taxonomy_value_key: string }>) => {
  const seen = new Set<string>();
  const uniqueKeys: string[] = [];
  for (const answer of answers) {
    const key = answer.taxonomy_value_key;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueKeys.push(key);
    }
  }

  // Caller (controller) is responsible for filtering invalid keys before reaching here.
  const pairs = uniqueKeys.map((key) => parseTaxonomyValueKey(key)!);
  return pairs.map(({ taxonomyKey, valueKey }) => ({
    taxonomyKey,
    valueKey,
    score: 1.0,
  }));
};

const sendMissionMatchingEmail = async (params: {
  userScoringId: string;
  distinctId: string;
  email: string;
  missionAlertEnabled: boolean;
  missionId?: string;
}): Promise<{ status: "sent" } | { status: "skipped"; reason: MissionEmailSkipReason } | { status: "failed" }> => {
  const contactResult = await createOrUpdateContact({
    email: params.email,
    distinctId: params.distinctId,
    userScoringId: params.userScoringId,
    missionAlertEnabled: params.missionAlertEnabled,
    listId: BREVO_CONTACT_LIST_ID,
  });

  if (!contactResult.ok) {
    return { status: "failed" };
  }

  const emailParams = await buildMissionEmailParams({
    userScoringId: params.userScoringId,
    missionId: params.missionId,
  });

  if (!emailParams) {
    return { status: "skipped", reason: getMissionEmailSkipReason(params.missionId) };
  }

  const emailResult = await sendTemplate(TEMPLATE_IDS.MISSION_MATCHING_RESULTS, {
    emailTo: [params.email],
    params: emailParams,
    tags: ["user-scoring", "mission-matching-results"],
  });

  if (!emailResult.ok) {
    return { status: "failed" };
  }

  return { status: "sent" };
};

export const userScoringService = {
  async exists(userScoringId: string) {
    return Boolean(await userScoringRepository.findById(userScoringId));
  },

  async create(input: CreateUserScoringInput) {
    const valuesToPersist = buildValuesToPersist(input.answers);
    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await userScoringRepository.create({
      expiresAt,
      values: valuesToPersist,
      geo: input.geo ? { lat: input.geo.lat, lon: input.geo.lon, radiusKm: input.geo.radius_km } : undefined,
      distinctId: input?.distinctId,
      missionAlertEnabled: input.missionAlertEnabled,
    });

    return { id: userScoring.id, created_at: userScoring.createdAt };
  },

  async update(input: UpdateUserScoringInput) {
    const userScoring = await userScoringRepository.findById(input.userScoringId);
    if (!userScoring) {
      return { status: "not_found" as const };
    }

    if (!userScoring.distinctId || userScoring.distinctId !== input.distinctId) {
      return { status: "forbidden" as const };
    }

    const valuesToPersist = input.answers ? buildValuesToPersist(input.answers) : [];
    const result = await userScoringRepository.update({
      userScoringId: input.userScoringId,
      values: valuesToPersist,
      missionAlertEnabled: input.missionAlertEnabled,
    });

    const data = {
      user_scoring_id: input.userScoringId,
      created_count: result.createdCount,
      mission_alert_enabled: result.missionAlertEnabled,
    };

    if (!input.email) {
      return {
        status: "success" as const,
        data,
      };
    }

    const emailResult = await sendMissionMatchingEmail({
      userScoringId: input.userScoringId,
      distinctId: input.distinctId,
      email: input.email,
      missionId: input.missionId,
      missionAlertEnabled: result.missionAlertEnabled,
    });

    if (emailResult.status === "failed") {
      return {
        status: "email_failed" as const,
        data: {
          ...data,
          email_sent: false,
        },
      };
    }

    if (emailResult.status === "skipped") {
      return {
        status: "success" as const,
        data: {
          ...data,
          email_sent: false,
          email_skip_reason: emailResult.reason,
        },
      };
    }

    return {
      status: "success" as const,
      data: {
        ...data,
        email_sent: true,
      },
    };
  },
};
