import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { asyncTaskBus } from "@/services/async-task";
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
  reindexRequested?: number;
  reindexFailed?: number;
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
    let reindexRequested = 0;
    let reindexFailed = 0;

    // Resynchronise Typesense au fil du rebuild : chaque mission dont l'appartenance au snapshot a
    // changé est republiée sur le bus (at-least-once, récupérable via SQS). On empile tout dans la
    // file d'un coup ; c'est au worker de réguler son débit de traitement. Les doublons entre
    // diffuseurs sont sans effet (upsert idempotent côté worker).
    // Récupération : un échec de publish laisse `reindexFailed>0` (success=false) sans que la ligne SQL
    // déjà écrite soit rejouée ⇒ relancer alors `update-mission-index` (réindexation complète) pour
    // reconverger Typesense sur PostgreSQL.
    const republishTouchedMissions = async (missionIds: string[]): Promise<void> => {
      await Promise.all(
        missionIds.map(async (missionId) => {
          try {
            await asyncTaskBus.publish({ type: "mission.index", payload: { missionId, action: "upsert" } });
            reindexRequested++;
          } catch (error) {
            reindexFailed++;
            captureException(error, { extra: { missionId } });
          }
        })
      );
    };

    for (const distributionPublisherId of distributionPublisherIds) {
      const distributionPublisher = await missionDiffusionService.rebuildForDistributionPublisher(distributionPublisherId, {
        dryRun,
        onMissionsTouched: republishTouchedMissions,
      });
      added += distributionPublisher.added;
      removed += distributionPublisher.removed;
      console.log(
        `[MissionDiffusionRebuild] distributionPublisher=${distributionPublisher.distributionPublisherId} desired=${distributionPublisher.desired} added=${distributionPublisher.added} removed=${distributionPublisher.removed} in ${distributionPublisher.durationMs}ms`
      );
    }

    // Missions des diffuseurs sortis de la population : collectées AVANT la purge, puis republiées pour
    // qu'elles perdent le diffuseur dans `distributionPublisherIds` côté Typesense (sinon elles
    // continueraient d'apparaître dans /browse pour ce diffuseur jusqu'à une réindexation externe).
    const prunedMissionIds = dryRun ? [] : await missionDiffusionRepository.findMissionIdsForDistributionPublishersNotIn(distributionPublisherIds);

    const prunedDistributionPublishers = dryRun
      ? await missionDiffusionRepository.countRowsForDistributionPublishersNotIn(distributionPublisherIds)
      : await missionDiffusionRepository.deleteRowsForDistributionPublishersNotIn(distributionPublisherIds);
    removed += prunedDistributionPublishers;

    await republishTouchedMissions(prunedMissionIds);
    const durationMs = Date.now() - start.getTime();

    const mode = dryRun ? "Dry-run done" : "Done";
    console.log(
      `[MissionDiffusionRebuild] ${mode}: ${distributionPublisherIds.length} distribution publishers, +${added} / -${removed} lignes (dont ${prunedDistributionPublishers} purgées), ${reindexRequested} réindexations demandées (${reindexFailed} échecs), en ${durationMs}ms`
    );

    return {
      success: reindexFailed === 0,
      timestamp: new Date(),
      distributionPublishers: distributionPublisherIds.length,
      added,
      removed,
      prunedDistributionPublishers,
      reindexRequested,
      reindexFailed,
      durationMs,
      dryRun,
      message: `${dryRun ? "Dry-run : " : ""}${distributionPublisherIds.length} publishers de diffusion rebuild : +${added} / -${removed} lignes, ${reindexRequested} réindexations en ${durationMs}ms`,
    };
  }
}
