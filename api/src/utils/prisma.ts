// Erreur Prisma P2002 : violation d'une contrainte d'unicité.
export const isUniqueViolation = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
