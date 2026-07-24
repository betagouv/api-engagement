import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { asyncTaskBus } from "@/services/async-task";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

// Taille des lots d'écriture (createMany/deleteMany) : borne la taille des requêtes et des
// paramètres liés, sans transaction longue globale.
const WRITE_BATCH_SIZE = 5000;
const READ_PAGE_SIZE = 5000;
const PUBLISH_BATCH_SIZE = 100;

export type MissionDiffusionRebuildDistributionPublisherResult = {
  distributionPublisherId: string;
  desired: number;
  added: number;
  removed: number;
  durationMs: number;
  dryRun?: boolean;
};

// Callback invoqué au fil des lots avec les missionId dont l'appartenance au snapshot a changé
// (ajoutées ou retirées). Sert à resynchroniser Typesense après application des écritures. Jamais
// appelé en dryRun.
type RebuildOptions = {
  dryRun?: boolean;
  onMissionsTouched?: (missionIds: string[]) => Promise<void>;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

type SnapshotWhere = Awaited<ReturnType<typeof publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere>>;

const enqueueMissionDiffusion = async (missionId: string): Promise<void> => {
  await asyncTaskBus.publish({ type: "mission.diffusion", payload: { missionId } });
};

type DiffHandlers = {
  onAdded: (missionIds: string[]) => Promise<number>;
  onRemoved: (missionIds: string[]) => Promise<number>;
};

const visitDistributionPublisherDiff = async (
  distributionPublisherId: string,
  snapshotWhere: SnapshotWhere,
  handlers: DiffHandlers
): Promise<{ desired: number; added: number; removed: number }> => {
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

    if (toRemove.length > 0) {
      removed += await handlers.onRemoved(toRemove);
    }

    if (existingIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

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

    if (toAdd.length > 0) {
      added += await handlers.onAdded(toAdd);
    }

    if (desiredIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

  return { desired, added, removed };
};

export type MissionDiffusionRebuildMissionResult = {
  missionId: string;
  desired: number;
  added: number;
  removed: number;
  durationMs: number;
};

export type MissionDiffusionPublisherFanOutResult = {
  distributionPublisherId: string;
  desired: number;
  added: number;
  removed: number;
  queued: number;
  durationMs: number;
};

export const missionDiffusionService = {
  async enqueue(missionId: string): Promise<void> {
    await enqueueMissionDiffusion(missionId);
  },

  async enqueueChangedMissionsForDistributionPublisher(distributionPublisherId: string): Promise<MissionDiffusionPublisherFanOutResult> {
    const start = Date.now();
    const isDistributionPublisher = await publisherDiffusionRuleService.isDistributionPublisherForSnapshot(distributionPublisherId);
    const snapshotWhere = isDistributionPublisher
      ? await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere(distributionPublisherId)
      : ({ id: { in: [] } } satisfies SnapshotWhere);
    const enqueue = async (missionIds: string[]): Promise<number> => {
      for (const batch of chunk(missionIds, PUBLISH_BATCH_SIZE)) {
        await Promise.all(batch.map(enqueueMissionDiffusion));
      }
      return missionIds.length;
    };

    const result = await visitDistributionPublisherDiff(distributionPublisherId, snapshotWhere, {
      onAdded: enqueue,
      onRemoved: enqueue,
    });

    return {
      distributionPublisherId,
      ...result,
      queued: result.added + result.removed,
      durationMs: Date.now() - start,
    };
  },

  /**
   * Reconstruit le snapshot d'un publisher de diffusion par diff paginé. Les suppressions sont
   * appliquées avant les insertions pour éviter un snapshot transitoirement plus permissif.
   */
  async rebuildForDistributionPublisher(distributionPublisherId: string, options: RebuildOptions = {}): Promise<MissionDiffusionRebuildDistributionPublisherResult> {
    const start = Date.now();
    const snapshotWhere = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere(distributionPublisherId);
    const apply = (operation: (batch: string[]) => Promise<number>) => async (missionIds: string[]): Promise<number> => {
      let changed = 0;
      for (const batch of chunk(missionIds, WRITE_BATCH_SIZE)) {
        changed += options.dryRun ? batch.length : await operation(batch);
      }
      if (!options.dryRun && options.onMissionsTouched) {
        await options.onMissionsTouched(missionIds);
      }
      return changed;
    };
    const { desired, added, removed } = await visitDistributionPublisherDiff(distributionPublisherId, snapshotWhere, {
      onAdded: apply((batch) => missionDiffusionRepository.createManyForDistributionPublisher(distributionPublisherId, batch)),
      onRemoved: apply((batch) => missionDiffusionRepository.deleteManyForDistributionPublisher(distributionPublisherId, batch)),
    });

    return { distributionPublisherId, desired, added, removed, durationMs: Date.now() - start, dryRun: options.dryRun || undefined };
  },

  async rebuildForMission(missionId: string): Promise<MissionDiffusionRebuildMissionResult> {
    const start = Date.now();
    const mission = await missionRepository.findUnique({
      where: { id: missionId },
      select: {
        publisherId: true,
        deletedAt: true,
      },
    });

    const scopes = mission && mission.deletedAt === null ? await publisherDiffusionRuleService.findDistributionPublisherScopesForMission(mission.publisherId) : [];
    const desiredPublisherIds = await missionDiffusionRepository.findDistributionPublisherIdsForMission(missionId, scopes);
    const { added, removed } = await missionDiffusionRepository.replaceForMission(missionId, desiredPublisherIds);

    return {
      missionId,
      desired: desiredPublisherIds.length,
      added,
      removed,
      durationMs: Date.now() - start,
    };
  },
};

export default missionDiffusionService;
