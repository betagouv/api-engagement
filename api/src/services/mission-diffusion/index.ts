import { Client } from "pg";

import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

// Taille des lots d'écriture (createMany/deleteMany) : borne la taille des requêtes et des
// paramètres liés, sans transaction longue globale.
const WRITE_BATCH_SIZE = 5000;
const READ_PAGE_SIZE = 5000;
const REBUILD_LOCK_NAMESPACE = 1_329_889_109;
const REBUILD_LOCK_KEY = 1_840_765_554;

export type MissionDiffusionRebuildDistributionPublisherResult = {
  distributionPublisherId: string;
  desired: number;
  added: number;
  removed: number;
  durationMs: number;
  dryRun?: boolean;
};

export type MissionDiffusionRebuildResult = {
  distributionPublishers: number;
  added: number;
  removed: number;
  prunedDistributionPublishers: number;
  durationMs: number;
  perDistributionPublisher: MissionDiffusionRebuildDistributionPublisherResult[];
  skippedBecauseAlreadyRunning?: boolean;
  dryRun?: boolean;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const withRebuildLock = async <T>(callback: () => Promise<T>): Promise<T | null> => {
  const client = new Client({ connectionString: process.env.DATABASE_URL_CORE });
  let acquired = false;

  await client.connect();
  try {
    const lockResult = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1, $2) AS locked", [REBUILD_LOCK_NAMESPACE, REBUILD_LOCK_KEY]);
    acquired = lockResult.rows[0]?.locked === true;
    if (!acquired) {
      return null;
    }

    return await callback();
  } finally {
    try {
      if (acquired) {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [REBUILD_LOCK_NAMESPACE, REBUILD_LOCK_KEY]);
      }
    } finally {
      await client.end();
    }
  }
};

type SnapshotWhere = Awaited<ReturnType<typeof publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere>>;

const deleteStaleRowsByPages = async (distributionPublisherId: string, snapshotWhere: SnapshotWhere, options: { dryRun?: boolean }): Promise<number> => {
  let removed = 0;
  let afterMissionId: string | undefined;

  while (true) {
    const existingIds = await missionDiffusionRepository.findMissionIdsPageByDistributionPublisher(distributionPublisherId, { afterMissionId, take: READ_PAGE_SIZE });
    if (existingIds.length === 0) {
      break;
    }
    afterMissionId = existingIds[existingIds.length - 1];

    const desiredExistingIds = await missionRepository.findIds({ AND: [snapshotWhere, { deletedAt: null }, { id: { in: existingIds } }] });
    const desiredExistingSet = new Set(desiredExistingIds);
    const toRemove = existingIds.filter((id) => !desiredExistingSet.has(id));

    for (const batch of chunk(toRemove, WRITE_BATCH_SIZE)) {
      removed += options.dryRun ? batch.length : await missionDiffusionRepository.deleteManyForDistributionPublisher(distributionPublisherId, batch);
    }

    if (existingIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

  return removed;
};

const createMissingRowsByPages = async (
  distributionPublisherId: string,
  snapshotWhere: SnapshotWhere,
  options: { dryRun?: boolean }
): Promise<{ desired: number; added: number }> => {
  let desired = 0;
  let added = 0;
  let afterId: string | undefined;

  while (true) {
    const desiredIds = await missionRepository.findIdsPage({ AND: [snapshotWhere, { deletedAt: null }] }, { afterId, take: READ_PAGE_SIZE });
    if (desiredIds.length === 0) {
      break;
    }
    afterId = desiredIds[desiredIds.length - 1];
    desired += desiredIds.length;

    const existingDesiredIds = await missionDiffusionRepository.findExistingMissionIdsForDistributionPublisher(distributionPublisherId, desiredIds);
    const existingDesiredSet = new Set(existingDesiredIds);
    const toAdd = desiredIds.filter((id) => !existingDesiredSet.has(id));

    for (const batch of chunk(toAdd, WRITE_BATCH_SIZE)) {
      added += options.dryRun ? batch.length : await missionDiffusionRepository.createManyForDistributionPublisher(distributionPublisherId, batch);
    }

    if (desiredIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

  return { desired, added };
};

export const missionDiffusionService = {
  /**
   * Reconstruit le snapshot d'un publisher de diffusion par diff paginé. Les suppressions sont
   * appliquées avant les insertions pour éviter un snapshot transitoirement plus permissif.
   */
  async rebuildForDistributionPublisher(distributionPublisherId: string, options: { dryRun?: boolean } = {}): Promise<MissionDiffusionRebuildDistributionPublisherResult> {
    const start = Date.now();
    const snapshotWhere = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere(distributionPublisherId);

    const removed = await deleteStaleRowsByPages(distributionPublisherId, snapshotWhere, options);
    const { desired, added } = await createMissingRowsByPages(distributionPublisherId, snapshotWhere, options);

    return { distributionPublisherId, desired, added, removed, durationMs: Date.now() - start, dryRun: options.dryRun || undefined };
  },

  /**
   * Reconstruit le snapshot complet : recompute par diff pour chaque publisher de la population, puis
   * purge les lignes des publishers qui en sont sortis. Non transactionnel entre publishers
   * (la table reste lisible en permanence). Un advisory lock PostgreSQL empêche deux rebuilds
   * complets de tourner en parallèle.
   */
  async rebuildAll(options: { dryRun?: boolean } = {}): Promise<MissionDiffusionRebuildResult> {
    const start = Date.now();

    const result = await withRebuildLock(async () => {
      const distributionPublisherIds = await publisherDiffusionRuleService.findDistributionPublisherIdsForSnapshot();

      const perDistributionPublisher: MissionDiffusionRebuildDistributionPublisherResult[] = [];
      for (const distributionPublisherId of distributionPublisherIds) {
        perDistributionPublisher.push(await this.rebuildForDistributionPublisher(distributionPublisherId, options));
      }

      const prunedDistributionPublishers = options.dryRun
        ? await missionDiffusionRepository.countRowsForDistributionPublishersNotIn(distributionPublisherIds)
        : await missionDiffusionRepository.deleteRowsForDistributionPublishersNotIn(distributionPublisherIds);

      return {
        distributionPublishers: perDistributionPublisher.length,
        added: perDistributionPublisher.reduce((sum, result) => sum + result.added, 0),
        removed: perDistributionPublisher.reduce((sum, result) => sum + result.removed, 0) + prunedDistributionPublishers,
        prunedDistributionPublishers,
        durationMs: Date.now() - start,
        perDistributionPublisher,
        dryRun: options.dryRun || undefined,
      };
    });

    return (
      result ?? {
        distributionPublishers: 0,
        added: 0,
        removed: 0,
        prunedDistributionPublishers: 0,
        durationMs: Date.now() - start,
        perDistributionPublisher: [],
        skippedBecauseAlreadyRunning: true,
        dryRun: options.dryRun || undefined,
      }
    );
  },
};

export default missionDiffusionService;
