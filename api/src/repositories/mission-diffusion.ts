import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

// Permet d'exécuter les opérations dans une transaction Prisma existante (tx) ou hors transaction.
const client = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const missionDiffusionRepository = {
  // Liste des `mission_id` déjà matérialisés pour un diffuseur (source du diff du rebuild).
  async findMissionIdsByDiffuser(diffuserPublisherId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    const rows = await client(tx).missionDiffusion.findMany({
      where: { diffuserPublisherId },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  async createManyForDiffuser(diffuserPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const result = await client(tx).missionDiffusion.createMany({
      data: missionIds.map((missionId) => ({ diffuserPublisherId, missionId })),
      skipDuplicates: true,
    });
    return result.count;
  },

  async deleteManyForDiffuser(diffuserPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const result = await client(tx).missionDiffusion.deleteMany({
      where: { diffuserPublisherId, missionId: { in: missionIds } },
    });
    return result.count;
  },

  // Purge les lignes des diffuseurs qui ne sont plus dans l'ensemble à allowlist (règles retirées
  // depuis le dernier rebuild). Liste vide ⇒ table vidée (plus aucun diffuseur à allowlist).
  async deleteRowsForDiffusersNotIn(diffuserPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    const result = await client(tx).missionDiffusion.deleteMany({
      where: diffuserPublisherIds.length ? { diffuserPublisherId: { notIn: diffuserPublisherIds } } : {},
    });
    return result.count;
  },

  async countByDiffuser(diffuserPublisherId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({ where: { diffuserPublisherId } });
  },

  async count(tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count();
  },
};
