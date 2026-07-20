import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

// Permet d'exécuter les opérations dans une transaction Prisma existante (tx) ou hors transaction.
const client = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const missionDiffusionRepository = {
  // Liste des `mission_id` déjà matérialisés pour un publisher de diffusion (source du diff du rebuild).
  async findMissionIdsByDistributionPublisher(distributionPublisherId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    const rows = await client(tx).missionDiffusion.findMany({
      where: { distributionPublisherId },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  async findMissionIdsPageByDistributionPublisher(
    distributionPublisherId: string,
    { afterMissionId, take }: { afterMissionId?: string; take: number },
    tx?: Prisma.TransactionClient
  ): Promise<string[]> {
    const rows = await client(tx).missionDiffusion.findMany({
      where: {
        distributionPublisherId,
        ...(afterMissionId ? { missionId: { gt: afterMissionId } } : {}),
      },
      orderBy: { missionId: "asc" },
      take,
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  async findExistingMissionIdsForDistributionPublisher(distributionPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<string[]> {
    if (missionIds.length === 0) {
      return [];
    }
    const rows = await client(tx).missionDiffusion.findMany({
      where: { distributionPublisherId, missionId: { in: missionIds } },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  async createManyForDistributionPublisher(distributionPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const result = await client(tx).missionDiffusion.createMany({
      data: missionIds.map((missionId) => ({ distributionPublisherId, missionId })),
      skipDuplicates: true,
    });
    return result.count;
  },

  async deleteManyForDistributionPublisher(distributionPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const result = await client(tx).missionDiffusion.deleteMany({
      where: { distributionPublisherId, missionId: { in: missionIds } },
    });
    return result.count;
  },

  // Purge les lignes des publishers de diffusion sortis de la population du snapshot.
  // Liste vide ⇒ table vidée.
  async deleteRowsForDistributionPublishersNotIn(distributionPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    const result = await client(tx).missionDiffusion.deleteMany({
      where: distributionPublisherIds.length ? { distributionPublisherId: { notIn: distributionPublisherIds } } : {},
    });
    return result.count;
  },

  async countRowsForDistributionPublishersNotIn(distributionPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({
      where: distributionPublisherIds.length ? { distributionPublisherId: { notIn: distributionPublisherIds } } : {},
    });
  },

  async countByDistributionPublisher(distributionPublisherId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({ where: { distributionPublisherId } });
  },

  async count(tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count();
  },
};
