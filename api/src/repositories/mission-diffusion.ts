import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

// Permet d'exécuter les opérations dans une transaction Prisma existante (tx) ou hors transaction.
const client = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const missionDiffusionRepository = {
  // Diffuseurs (publishers de diffusion) matérialisés pour une mission donnée, avec leurs infos publisher.
  // Utilise l'index `mission_diffusion_mission_id_idx`.
  async findDistributionPublishersByMission(missionId: string, tx?: Prisma.TransactionClient) {
    return client(tx).missionDiffusion.findMany({
      where: { missionId, isDeleted: false },
      select: {
        createdAt: true,
        distributionPublisher: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  // Liste des `mission_id` déjà matérialisés pour un publisher de diffusion (source du diff du rebuild).
  async findMissionIdsByDistributionPublisher(distributionPublisherId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    const rows = await client(tx).missionDiffusion.findMany({
      where: { distributionPublisherId, isDeleted: false },
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
        isDeleted: false,
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
      where: { distributionPublisherId, missionId: { in: missionIds }, isDeleted: false },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  async createManyForDistributionPublisher(distributionPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const now = new Date();
    const restored = await client(tx).missionDiffusion.updateMany({
      where: { distributionPublisherId, missionId: { in: missionIds }, isDeleted: true },
      data: { isDeleted: false, deletedAt: null, updatedAt: now },
    });
    const result = await client(tx).missionDiffusion.createMany({
      data: missionIds.map((missionId) => ({ distributionPublisherId, missionId })),
      skipDuplicates: true,
    });
    return restored.count + result.count;
  },

  async deleteManyForDistributionPublisher(distributionPublisherId: string, missionIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (missionIds.length === 0) {
      return 0;
    }
    const now = new Date();
    const result = await client(tx).missionDiffusion.updateMany({
      where: { distributionPublisherId, missionId: { in: missionIds }, isDeleted: false },
      data: { isDeleted: true, deletedAt: now, updatedAt: now },
    });
    return result.count;
  },

  // Missions ayant au moins une ligne pour un publisher de diffusion sorti de la population du snapshot.
  // À collecter AVANT la purge pour pouvoir les réindexer (elles doivent perdre ce diffuseur dans
  // Typesense). Liste vide ⇒ toutes les missions matérialisées (mêmes bornes que la purge).
  // `groupBy` = DISTINCT côté Postgres : borné au nombre de missions distinctes (≤ stock des missions),
  // et non au nombre de lignes lues (contrairement au `distinct` Prisma, post-traité côté client).
  async findMissionIdsForDistributionPublishersNotIn(distributionPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<string[]> {
    const rows = await client(tx).missionDiffusion.groupBy({
      by: ["missionId"],
      where: { isDeleted: false, ...(distributionPublisherIds.length ? { distributionPublisherId: { notIn: distributionPublisherIds } } : {}) },
    });
    return rows.map((row) => row.missionId);
  },

  // Purge les lignes des publishers de diffusion sortis de la population du snapshot.
  // Liste vide ⇒ table vidée.
  async deleteRowsForDistributionPublishersNotIn(distributionPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    const now = new Date();
    const result = await client(tx).missionDiffusion.updateMany({
      where: { isDeleted: false, ...(distributionPublisherIds.length ? { distributionPublisherId: { notIn: distributionPublisherIds } } : {}) },
      data: { isDeleted: true, deletedAt: now, updatedAt: now },
    });
    return result.count;
  },

  async countRowsForDistributionPublishersNotIn(distributionPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({
      where: { isDeleted: false, ...(distributionPublisherIds.length ? { distributionPublisherId: { notIn: distributionPublisherIds } } : {}) },
    });
  },

  async countByDistributionPublisher(distributionPublisherId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({ where: { distributionPublisherId, isDeleted: false } });
  },

  async count(tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).missionDiffusion.count({ where: { isDeleted: false } });
  },
};
