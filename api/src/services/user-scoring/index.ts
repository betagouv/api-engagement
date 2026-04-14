import { userScoringRepository } from "@/repositories/user-scoring";

const USER_SCORING_TTL_DAYS = 7;

export class UserScoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserScoringValidationError";
  }
}

interface CreateUserScoringInput {
  answers: Array<{ taxonomy_value_id: string }>;
  geo?: {
    lat: number;
    lon: number;
    radius_km?: number;
  };
}

export const userScoringService = {
  async create(input: CreateUserScoringInput) {
    // Normalize to lowercase + deduplicate (keep first occurrence)
    const seen = new Set<string>();
    const uniqueIds: string[] = [];
    for (const answer of input.answers) {
      const id = answer.taxonomy_value_id.toLowerCase();
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    // Batch-fetch all ids (active and inactive)
    const allValues = await userScoringRepository.findTaxonomyValuesByIds(uniqueIds);

    // Unknown IDs (not in DB at all) → 400
    const foundIds = new Set(allValues.map((v) => v.id));
    const unknownId = uniqueIds.find((id) => !foundIds.has(id));
    if (unknownId) {
      throw new UserScoringValidationError(`taxonomy_value_id '${unknownId}' is unknown`);
    }

    // Inactive IDs → silently skipped for backward compatibility
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
