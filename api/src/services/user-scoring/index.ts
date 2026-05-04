import { TAXONOMY } from "@engagement/taxonomy";

import { userScoringRepository } from "@/repositories/user-scoring";
import { createOrUpdateContact, sendTemplate, TEMPLATE_IDS } from "@/services/brevo";
import { buildMissionEmailParams, getMissionEmailSkipReason, type MissionEmailSkipReason } from "@/services/user-scoring/email";

const BREVO_CONTACT_LIST_ID = 22;
const USER_SCORING_TTL_DAYS = 7;

type UserScoringAnswerInput = {
  taxonomy: string;
  value?: string;
  params?: Record<string, unknown>;
};

type UserScoringGeoInput = {
  lat: number;
  lon: number;
  radiusKm?: number;
  countryCode?: string;
};

type TaxonomyTransformerResult =
  | string[]
  | {
      values?: string[];
      geo?: UserScoringGeoInput;
    };

type TaxonomyDefinitionWithTransformer = {
  values: Record<string, unknown>;
  transformer?: (params: unknown) => TaxonomyTransformerResult;
};

interface CreateUserScoringInput {
  answers: UserScoringAnswerInput[];
  distinctId?: string;
  missionAlertEnabled: boolean;
}

interface UpdateUserScoringInput {
  userScoringId: string;
  distinctId: string;
  answers?: UserScoringAnswerInput[];
  missionAlertEnabled?: boolean;
  email?: string;
  missionId?: string;
}

export class UserScoringAnswerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserScoringAnswerValidationError";
  }
}

const getTaxonomyDefinition = (taxonomyKey: string): TaxonomyDefinitionWithTransformer | null => {
  if (!Object.prototype.hasOwnProperty.call(TAXONOMY, taxonomyKey)) {
    return null;
  }

  return TAXONOMY[taxonomyKey as keyof typeof TAXONOMY] as TaxonomyDefinitionWithTransformer;
};

type ResolvedAnswer = {
  values: string[];
  geo?: UserScoringGeoInput;
};

const normalizeTransformerResult = (result: TaxonomyTransformerResult): ResolvedAnswer => {
  if (Array.isArray(result)) {
    return { values: result };
  }

  return {
    values: result.values ?? [],
    geo: result.geo,
  };
};

const resolveAnswer = (answer: UserScoringAnswerInput): ResolvedAnswer => {
  const taxonomy = getTaxonomyDefinition(answer.taxonomy);
  if (!taxonomy) {
    throw new UserScoringAnswerValidationError(`Unknown taxonomy: ${answer.taxonomy}`);
  }

  if (answer.value !== undefined) {
    if (!Object.prototype.hasOwnProperty.call(taxonomy.values, answer.value)) {
      throw new UserScoringAnswerValidationError(`Unknown taxonomy value: ${answer.taxonomy}.${answer.value}`);
    }

    return { values: [answer.value] };
  }

  if (!taxonomy.transformer) {
    throw new UserScoringAnswerValidationError(`No transformer configured for taxonomy: ${answer.taxonomy}`);
  }

  let resolvedAnswer: ResolvedAnswer;
  try {
    resolvedAnswer = normalizeTransformerResult(taxonomy.transformer(answer.params));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid taxonomy params";
    throw new UserScoringAnswerValidationError(message);
  }

  for (const value of resolvedAnswer.values) {
    if (!Object.prototype.hasOwnProperty.call(taxonomy.values, value)) {
      throw new UserScoringAnswerValidationError(`Transformer returned unknown taxonomy value: ${answer.taxonomy}.${value}`);
    }
  }

  return resolvedAnswer;
};

const buildValuesToPersist = (answers: UserScoringAnswerInput[]) => {
  const seen = new Set<string>();
  const uniquePairs: Array<{ taxonomyKey: string; valueKey: string }> = [];
  let geo: UserScoringGeoInput | undefined;
  for (const answer of answers) {
    const resolvedAnswer = resolveAnswer(answer);
    if (resolvedAnswer.geo) {
      if (geo) {
        throw new UserScoringAnswerValidationError("Multiple location answers are not supported");
      }
      geo = resolvedAnswer.geo;
    }

    for (const valueKey of resolvedAnswer.values) {
      const key = `${answer.taxonomy}.${valueKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push({ taxonomyKey: answer.taxonomy, valueKey });
      }
    }
  }

  if (uniquePairs.length === 0 && !geo) {
    throw new UserScoringAnswerValidationError("No taxonomy value resolved from answers");
  }

  return {
    values: uniquePairs.map(({ taxonomyKey, valueKey }) => ({
      taxonomyKey,
      valueKey,
      score: 1.0,
    })),
    geo,
  };
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
    const scoringData = buildValuesToPersist(input.answers);
    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await userScoringRepository.create({
      expiresAt,
      values: scoringData.values,
      geo: scoringData.geo,
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

    const scoringData = input.answers ? buildValuesToPersist(input.answers) : { values: [], geo: undefined };
    const result = await userScoringRepository.update({
      userScoringId: input.userScoringId,
      values: scoringData.values,
      replaceAnswers: input.answers !== undefined,
      geo: scoringData.geo,
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
