import { parseTaxonomyValueKey } from "@engagement/taxonomy";

import { userScoringRepository } from "@/repositories/user-scoring";

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
