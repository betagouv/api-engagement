import { prisma } from "@/db/postgres";
import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

// Taille des lots d'écriture (createMany/deleteMany) : borne la taille des requêtes et des
// paramètres liés, sans transaction longue globale.
const WRITE_BATCH_SIZE = 5000;

export type MissionDiffusionRebuildDistributionPublisherResult = {
  distributionPublisherId: string;
  desired: number;
  added: number;
  removed: number;
  durationMs: number;
};

export type MissionDiffusionRebuildResult = {
  distributionPublishers: number;
  added: number;
  removed: number;
  prunedDistributionPublishers: number;
  durationMs: number;
  perDistributionPublisher: MissionDiffusionRebuildDistributionPublisherResult[];
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

// Ids des missions non supprimées autorisées par l'allowlist du publisher de diffusion (sans scope propre ni
// bypass : cf. buildMissionDiffuseurAllowlistWhere). Sans allowlist ⇒ aucune ligne matérialisée.
const listDesiredMissionIds = async (distributionPublisherId: string): Promise<string[]> => {
  const allowlistWhere = await publisherDiffusionRuleService.buildMissionDiffuseurAllowlistWhere(distributionPublisherId);
  if (!allowlistWhere) {
    return [];
  }
  return missionRepository.findIds({ AND: [allowlistWhere, { deletedAt: null }] });
};

export const missionDiffusionService = {
  /**
   * Reconstruit le snapshot d'un publisher de diffusion par diff : calcule l'ensemble d'ids voulu depuis les
   * règles, le compare à l'existant en table, applique le delta dans une transaction. Idempotent :
   * un second appel sans changement écrit 0 ligne (et n'ouvre pas de transaction).
   */
  async rebuildForDistributionPublisher(distributionPublisherId: string): Promise<MissionDiffusionRebuildDistributionPublisherResult> {
    const start = Date.now();

    const [desiredIds, existingIds] = await Promise.all([
      listDesiredMissionIds(distributionPublisherId),
      missionDiffusionRepository.findMissionIdsByDistributionPublisher(distributionPublisherId),
    ]);

    const desiredSet = new Set(desiredIds);
    const existingSet = new Set(existingIds);
    const toAdd = desiredIds.filter((id) => !existingSet.has(id));
    const toRemove = existingIds.filter((id) => !desiredSet.has(id));

    let added = 0;
    let removed = 0;

    if (toAdd.length > 0 || toRemove.length > 0) {
      // La table est une allowlist de lecture : le delta d'un publisher de diffusion est appliqué dans une seule
      // transaction (suppressions avant insertions) pour qu'aucune lecture ne voie un état transitoire
      // plus permissif que l'ancien ou le nouveau. La transaction ne porte que sur le delta (pas de
      // réécriture du stock), reste courte et n'impacte pas les autres publishers de diffusion.
      await prisma.$transaction(async (tx) => {
        for (const batch of chunk(toRemove, WRITE_BATCH_SIZE)) {
          removed += await missionDiffusionRepository.deleteManyForDistributionPublisher(distributionPublisherId, batch, tx);
        }
        for (const batch of chunk(toAdd, WRITE_BATCH_SIZE)) {
          added += await missionDiffusionRepository.createManyForDistributionPublisher(distributionPublisherId, batch, tx);
        }
      });
    }

    return { distributionPublisherId, desired: desiredIds.length, added, removed, durationMs: Date.now() - start };
  },

  /**
   * Reconstruit le snapshot complet : recompute par diff pour chaque publisher à allowlist, puis
   * purge les lignes des publishers qui n'ont plus d'allowlist. Non transactionnel entre publishers
   * (la table reste lisible en permanence). Idempotent : la protection contre deux rebuilds
   * concurrents est assurée par l'ordonnancement singleton du job (un chevauchement éventuel
   * converge sans corruption grâce au diff).
   */
  async rebuildAll(): Promise<MissionDiffusionRebuildResult> {
    const start = Date.now();

    const distributionPublisherIds = await publisherDiffusionRuleService.findDistributionPublisherIdsWithAllowlist();

    const perDistributionPublisher: MissionDiffusionRebuildDistributionPublisherResult[] = [];
    for (const distributionPublisherId of distributionPublisherIds) {
      perDistributionPublisher.push(await this.rebuildForDistributionPublisher(distributionPublisherId));
    }

    const prunedDistributionPublishers = await missionDiffusionRepository.deleteRowsForDistributionPublishersNotIn(distributionPublisherIds);

    return {
      distributionPublishers: perDistributionPublisher.length,
      added: perDistributionPublisher.reduce((sum, result) => sum + result.added, 0),
      removed: perDistributionPublisher.reduce((sum, result) => sum + result.removed, 0) + prunedDistributionPublishers,
      prunedDistributionPublishers,
      durationMs: Date.now() - start,
      perDistributionPublisher,
    };
  },
};

export default missionDiffusionService;
