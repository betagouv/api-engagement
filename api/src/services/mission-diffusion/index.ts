import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { asyncTaskBus } from "@/services/async-task";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

// Taille des lots d'écriture (createMany/deleteMany) : borne la taille des requêtes et des
// paramètres liés, sans transaction longue globale.
const WRITE_BATCH_SIZE = 5000;
const READ_PAGE_SIZE = 5000;

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

const deleteStaleRowsByPages = async (distributionPublisherId: string, snapshotWhere: SnapshotWhere, options: RebuildOptions): Promise<number> => {
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

    if (!options.dryRun && toRemove.length > 0 && options.onMissionsTouched) {
      await options.onMissionsTouched(toRemove);
    }

    if (existingIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

  return removed;
};

const createMissingRowsByPages = async (distributionPublisherId: string, snapshotWhere: SnapshotWhere, options: RebuildOptions): Promise<{ desired: number; added: number }> => {
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

    if (!options.dryRun && toAdd.length > 0 && options.onMissionsTouched) {
      await options.onMissionsTouched(toAdd);
    }

    if (desiredIds.length < READ_PAGE_SIZE) {
      break;
    }
  }

  return { desired, added };
};

export type MissionDiffusionRebuildMissionResult = {
  missionId: string;
  desired: number;
  added: number;
  removed: number;
  durationMs: number;
};

export const missionDiffusionService = {
  async enqueue(missionId: string): Promise<void> {
    await asyncTaskBus.publish({ type: "mission.diffusion", payload: { missionId } });
  },

  /**
   * Reconstruit le snapshot d'un publisher de diffusion par diff paginé. Les suppressions sont
   * appliquées avant les insertions pour éviter un snapshot transitoirement plus permissif.
   */
  async rebuildForDistributionPublisher(distributionPublisherId: string, options: RebuildOptions = {}): Promise<MissionDiffusionRebuildDistributionPublisherResult> {
    const start = Date.now();
    const snapshotWhere = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere(distributionPublisherId);

    const removed = await deleteStaleRowsByPages(distributionPublisherId, snapshotWhere, options);
    const { desired, added } = await createMissingRowsByPages(distributionPublisherId, snapshotWhere, options);

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
