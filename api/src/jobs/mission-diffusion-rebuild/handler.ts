import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

export interface MissionDiffusionRebuildJobPayload {
  dryRun?: boolean;
}

export interface MissionDiffusionRebuildJobResult extends JobResult {
  distributionPublishers?: number;
  added?: number;
  removed?: number;
  prunedDistributionPublishers?: number;
  durationMs?: number;
  dryRun?: boolean;
}

/*
Reconstruit périodiquement la table `mission_diffusion` (snapshot batch de l'allowlist explicite et du
scope propre). Recompute complet par diff (par publisher de diffusion), idempotent et relançable ; les
compteurs added/removed servent de métrique de drift. `dryRun=true` calcule les deltas sans écrire.
Aucune fraîcheur temps réel : la fenêtre de staleness (6h+) fait partie du contrat produit.
*/
export class MissionDiffusionRebuildHandler implements BaseHandler<MissionDiffusionRebuildJobPayload, MissionDiffusionRebuildJobResult> {
  name = "Rebuild table de diffusion (mission_diffusion)";

  async handle({ dryRun = false }: MissionDiffusionRebuildJobPayload = {}): Promise<MissionDiffusionRebuildJobResult> {
    const start = new Date();
    console.log(`[MissionDiffusionRebuild] Starting at ${start.toISOString()}${dryRun ? " (dry-run)" : ""}`);

    const distributionPublisherIds = await publisherDiffusionRuleService.findDistributionPublisherIdsForSnapshot();
    let added = 0;
    let removed = 0;

    for (const distributionPublisherId of distributionPublisherIds) {
      const distributionPublisher = await missionDiffusionService.rebuildForDistributionPublisher(distributionPublisherId, { dryRun });
      added += distributionPublisher.added;
      removed += distributionPublisher.removed;
      console.log(
        `[MissionDiffusionRebuild] distributionPublisher=${distributionPublisher.distributionPublisherId} desired=${distributionPublisher.desired} added=${distributionPublisher.added} removed=${distributionPublisher.removed} in ${distributionPublisher.durationMs}ms`
      );
    }

    const prunedDistributionPublishers = dryRun
      ? await missionDiffusionRepository.countRowsForDistributionPublishersNotIn(distributionPublisherIds)
      : await missionDiffusionRepository.deleteRowsForDistributionPublishersNotIn(distributionPublisherIds);
    removed += prunedDistributionPublishers;
    const durationMs = Date.now() - start.getTime();

    const mode = dryRun ? "Dry-run done" : "Done";
    console.log(
      `[MissionDiffusionRebuild] ${mode}: ${distributionPublisherIds.length} distribution publishers, +${added} / -${removed} lignes (dont ${prunedDistributionPublishers} purgées), en ${durationMs}ms`
    );

    return {
      success: true,
      timestamp: new Date(),
      distributionPublishers: distributionPublisherIds.length,
      added,
      removed,
      prunedDistributionPublishers,
      durationMs,
      dryRun,
      message: `${dryRun ? "Dry-run : " : ""}${distributionPublisherIds.length} publishers de diffusion rebuild : +${added} / -${removed} lignes en ${durationMs}ms`,
    };
  }
}
