import { prisma, prismaRead } from "@/db/postgres";

export type RepositoryReadOptions = {
  readPreference?: "primary" | "replica";
};

export const readQuery = async <T>(
  options: RepositoryReadOptions | undefined,
  query: (client: typeof prisma) => Promise<T>,
): Promise<T> => {
  if (options?.readPreference === "replica") {
    return query(prismaRead);
  }

  return query(prisma);
};
