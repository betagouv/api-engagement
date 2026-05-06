import { TAXONOMY } from "@engagement/taxonomy";

import { userScoringRepository } from "@/repositories/user-scoring";

const USER_SCORING_TTL_DAYS = 7;

type UserScoringAnswerInput = {
  taxonomy: string;
  value?: string;
  params?: Record<string, unknown>;
};

type TaxonomyDefinitionWithTransformer = {
  values: Record<string, unknown>;
  transformer?: (params: unknown) => string[];
};

interface CreateUserScoringInput {
  answers: UserScoringAnswerInput[];
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
  answers?: UserScoringAnswerInput[];
  geo?: {
    lat: number;
    lon: number;
    radius_km?: number;
  };
  missionAlertEnabled?: boolean;
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

const resolveAnswerValueKeys = (answer: UserScoringAnswerInput): string[] => {
  const taxonomy = getTaxonomyDefinition(answer.taxonomy);
  if (!taxonomy) {
    throw new UserScoringAnswerValidationError(`Unknown taxonomy: ${answer.taxonomy}`);
  }

  if (answer.value !== undefined) {
    if (!Object.prototype.hasOwnProperty.call(taxonomy.values, answer.value)) {
      throw new UserScoringAnswerValidationError(`Unknown taxonomy value: ${answer.taxonomy}.${answer.value}`);
    }

    return [answer.value];
  }

  if (!taxonomy.transformer) {
    throw new UserScoringAnswerValidationError(`No transformer configured for taxonomy: ${answer.taxonomy}`);
  }

  let resolvedValues: string[];
  try {
    resolvedValues = taxonomy.transformer(answer.params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid taxonomy params";
    throw new UserScoringAnswerValidationError(message);
  }

  for (const value of resolvedValues) {
    if (!Object.prototype.hasOwnProperty.call(taxonomy.values, value)) {
      throw new UserScoringAnswerValidationError(`Transformer returned unknown taxonomy value: ${answer.taxonomy}.${value}`);
    }
  }

  return resolvedValues;
};

const buildValuesToPersist = (answers: UserScoringAnswerInput[]) => {
  const seen = new Set<string>();
  const uniquePairs: Array<{ taxonomyKey: string; valueKey: string }> = [];
  for (const answer of answers) {
    for (const valueKey of resolveAnswerValueKeys(answer)) {
      const key = `${answer.taxonomy}.${valueKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push({ taxonomyKey: answer.taxonomy, valueKey });
      }
    }
  }

  if (uniquePairs.length === 0) {
    throw new UserScoringAnswerValidationError("No taxonomy value resolved from answers");
  }

  return uniquePairs.map(({ taxonomyKey, valueKey }) => ({
    taxonomyKey,
    valueKey,
    score: 1.0,
  }));
};

export const userScoringService = {
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
      geo: input.geo ? { lat: input.geo.lat, lon: input.geo.lon, radiusKm: input.geo.radius_km } : undefined,
      missionAlertEnabled: input.missionAlertEnabled,
    });

    return {
      status: "success" as const,
      data: {
        user_scoring_id: input.userScoringId,
        created_count: result.createdCount,
        mission_alert_enabled: result.missionAlertEnabled,
      },
    };
  },
};
