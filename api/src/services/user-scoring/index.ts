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
    // Deduplicate taxonomy_value_ids (keep first occurrence)
    const seen = new Set<string>();
    const uniqueIds: string[] = [];
    for (const answer of input.answers) {
      if (!seen.has(answer.taxonomy_value_id)) {
        seen.add(answer.taxonomy_value_id);
        uniqueIds.push(answer.taxonomy_value_id);
      }
    }

    // Batch-validate: all ids must exist and be active
    const validValues = await userScoringRepository.findActiveTaxonomyValues(uniqueIds);
    if (validValues.length !== uniqueIds.length) {
      const foundIds = new Set(validValues.map((v) => v.id));
      const invalid = uniqueIds.find((id) => !foundIds.has(id));
      throw new UserScoringValidationError(`taxonomy_value_id '${invalid}' is unknown or inactive`);
    }

    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await userScoringRepository.create({
      expiresAt,
      taxonomyValueIds: uniqueIds,
      geo: input.geo
        ? { lat: input.geo.lat, lon: input.geo.lon, radiusKm: input.geo.radius_km }
        : undefined,
    });

    return { id: userScoring.id, created_at: userScoring.createdAt };
  },
};
