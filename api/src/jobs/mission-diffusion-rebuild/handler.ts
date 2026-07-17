import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionDiffusionService } from "@/services/mission-diffusion";

export interface MissionDiffusionRebuildJobPayload {}

export interface MissionDiffusionRebuildJobResult extends JobResult {
  distributionPublishers?: number;
  added?: number;
  removed?: number;
  prunedDistributionPublishers?: number;
  durationMs?: number;
  skippedBecauseAlreadyRunning?: boolean;
}

/*
Reconstruit périodiquement la table `mission_diffusion` (snapshot batch du résultat d'évaluation des
diffusion rules). Recompute complet par diff (par publisher de diffusion), idempotent et relançable ; les
compteurs added/removed servent de métrique de drift. Aucune fraîcheur temps réel : la fenêtre de
staleness (6h+) fait partie du contrat produit. Un advisory lock PostgreSQL empêche les rebuilds
concurrents ; un second run est ignoré si un rebuild est déjà en cours.
*/
export class MissionDiffusionRebuildHandler implements BaseHandler<MissionDiffusionRebuildJobPayload, MissionDiffusionRebuildJobResult> {
  name = "Rebuild table de diffusion (mission_diffusion)";

  async handle(_payload: MissionDiffusionRebuildJobPayload = {}): Promise<MissionDiffusionRebuildJobResult> {
    const start = new Date();
    console.log(`[MissionDiffusionRebuild] Starting at ${start.toISOString()}`);

    const result = await missionDiffusionService.rebuildAll();

    if (result.skippedBecauseAlreadyRunning) {
      const message = "Rebuild ignoré : un autre rebuild mission_diffusion est déjà en cours";
      console.log(`[MissionDiffusionRebuild] ${message}`);
      return {
        success: true,
        timestamp: new Date(),
        distributionPublishers: 0,
        added: 0,
        removed: 0,
        prunedDistributionPublishers: 0,
        durationMs: result.durationMs,
        skippedBecauseAlreadyRunning: true,
        message,
      };
    }

    for (const distributionPublisher of result.perDistributionPublisher) {
      console.log(
        `[MissionDiffusionRebuild] distributionPublisher=${distributionPublisher.distributionPublisherId} desired=${distributionPublisher.desired} added=${distributionPublisher.added} removed=${distributionPublisher.removed} in ${distributionPublisher.durationMs}ms`
      );
    }

    console.log(
      `[MissionDiffusionRebuild] Done: ${result.distributionPublishers} distribution publishers, +${result.added} / -${result.removed} lignes (dont ${result.prunedDistributionPublishers} purgées), en ${result.durationMs}ms`
    );

    return {
      success: true,
      timestamp: new Date(),
      distributionPublishers: result.distributionPublishers,
      added: result.added,
      removed: result.removed,
      prunedDistributionPublishers: result.prunedDistributionPublishers,
      durationMs: result.durationMs,
      message: `${result.distributionPublishers} publishers de diffusion rebuild : +${result.added} / -${result.removed} lignes en ${result.durationMs}ms`,
    };
  }
}
