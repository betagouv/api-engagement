import { prisma } from "@/db/postgres";

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

    // Batch-validate all taxonomy_value_ids
    const validValues = await prisma.taxonomyValue.findMany({
      where: { id: { in: uniqueIds }, active: true },
      select: { id: true },
    });

    if (validValues.length !== uniqueIds.length) {
      const foundIds = new Set(validValues.map((v) => v.id));
      const invalid = uniqueIds.find((id) => !foundIds.has(id));
      throw new UserScoringValidationError(`taxonomy_value_id '${invalid}' is unknown or inactive`);
    }

    const expiresAt = new Date(Date.now() + USER_SCORING_TTL_DAYS * 24 * 60 * 60 * 1000);

    const userScoring = await prisma.userScoring.create({
      data: {
        expiresAt,
        values: {
          createMany: {
            data: uniqueIds.map((id) => ({ taxonomyValueId: id, score: 1.0 })),
          },
        },
        ...(input.geo
          ? {
              geo: {
                create: {
                  lat: input.geo.lat,
                  lon: input.geo.lon,
                  radiusKm: input.geo.radius_km,
                },
              },
            }
          : {}),
      },
    });

    return { id: userScoring.id, created_at: userScoring.createdAt };
  },
};
