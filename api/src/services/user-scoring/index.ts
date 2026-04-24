import { isValidTaxonomyValueKey } from "@engagement/taxonomy";

import { userScoringRepository } from "@/repositories/user-scoring";

const USER_SCORING_TTL_DAYS = 7;

export class UserScoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserScoringValidationError";
  }
}

interface CreateUserScoringInput {
  answers: Array<{ taxonomy_value_key: string }>;
  geo?: {
    lat: number;
    lon: number;
    radius_km?: number;
  };
}

const parsePrefixedKey = (prefixedKey: string): { taxonomyKey: string; valueKey: string } | null => {
  const dotIndex = prefixedKey.indexOf(".");
  if (dotIndex <= 0 || dotIndex === prefixedKey.length - 1) {
    return null;
  }
  return { taxonomyKey: prefixedKey.slice(0, dotIndex), valueKey: prefixedKey.slice(dotIndex + 1) };
};

export const userScoringService = {
  async create(input: CreateUserScoringInput) {
    // Deduplicate (keep first occurrence)
    const seen = new Set<string>();
    const uniqueKeys: string[] = [];
    for (const answer of input.answers) {
      const key = answer.taxonomy_value_key;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueKeys.push(key);
      }
    }

    // Validate format: each key must be "{taxonomy_key}.{value_key}"
    for (const key of uniqueKeys) {
      if (!parsePrefixedKey(key)) {
        throw new UserScoringValidationError(`taxonomy_value_key '${key}' is invalid: expected format '{taxonomy_key}.{value_key}'`);
      }

      if (!isValidTaxonomyValueKey(key)) {
        throw new UserScoringValidationError(`taxonomy_value_key '${key}' does not exist`);
      }
    }

    const pairs = uniqueKeys.map((key) => parsePrefixedKey(key)!);
    const valuesToPersist = pairs.map(({ taxonomyKey, valueKey }) => ({
      taxonomyKey,
      valueKey,
      score: 1.0,
    }));

    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await userScoringRepository.create({
      expiresAt,
      values: valuesToPersist,
      geo: input.geo ? { lat: input.geo.lat, lon: input.geo.lon, radiusKm: input.geo.radius_km } : undefined,
    });

    return { id: userScoring.id, created_at: userScoring.createdAt };
  },
};
