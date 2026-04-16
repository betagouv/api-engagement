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

    // Batch-fetch all keys (active and inactive)
    const allValues = await userScoringRepository.findTaxonomyValuesByKeys(uniqueKeys);

    // Unknown keys (not in DB at all) → 400
    const foundKeys = new Set(allValues.map((v) => v.key));
    const unknownKey = uniqueKeys.find((key) => !foundKeys.has(key));
    if (unknownKey) {
      throw new UserScoringValidationError(`taxonomy_value_key '${unknownKey}' is unknown`);
    }

    // Inactive keys → silently skipped for backward compatibility
    const activeIds = allValues.filter((v) => v.active).map((v) => v.id);

    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await userScoringRepository.create({
      expiresAt,
      taxonomyValueIds: activeIds,
      geo: input.geo
        ? { lat: input.geo.lat, lon: input.geo.lon, radiusKm: input.geo.radius_km }
        : undefined,
    });

    return { id: userScoring.id, created_at: userScoring.createdAt };
  },
};
