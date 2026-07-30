import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { asyncTaskBus } from "@/services/async-task";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

export interface MissionDiffusionRebuildJobPayload {
  dryRun?: boolean;
  // Restreint le rebuild à un seul publisher de diffusion (utile après correction de ses rules).
  // En mode ciblé, la purge des diffuseurs hors population est désactivée (sinon on viderait la table
  // pour tous les autres diffuseurs).
  publisherId?: string;
}

export interface MissionDiffusionRebuildJobResult extends JobResult {
  distributionPublishers?: number;
  added?: number;
  removed?: number;
  prunedDistributionPublishers?: number;
  // Nombre de touches (mission, diffuseur) collectées (avec doublons entre diffuseurs).
  reindexTouches?: number;
  // Nombre de missions distinctes réellement republiées sur le bus (après déduplication).
  distinctMissionsReindexed?: number;
  reindexRequested?: number;
  reindexFailed?: number;
  durationMs?: number;
  dryRun?: boolean;
  publisherId?: string;
}

/*
Reconstruit périodiquement la table `mission_diffusion` (snapshot batch de l'allowlist explicite et du
scope propre). Recompute complet par diff (par publisher de diffusion), idempotent et relançable ; les
compteurs added/removed servent de métrique de drift. `dryRun=true` calcule les deltas sans écrire.
`publisherId` restreint le rebuild à un seul diffuseur (sans purge cross-diffuseurs).
Aucune fraîcheur temps réel : la fenêtre de staleness (6h+) fait partie du contrat produit.
*/
export class MissionDiffusionRebuildHandler implements BaseHandler<MissionDiffusionRebuildJobPayload, MissionDiffusionRebuildJobResult> {
  name = "Rebuild table de diffusion (mission_diffusion)";

  async handle({ dryRun = false, publisherId }: MissionDiffusionRebuildJobPayload = {}): Promise<MissionDiffusionRebuildJobResult> {
    const start = new Date();
    const scoped = Boolean(publisherId);
    console.log(`[MissionDiffusionRebuild] Starting at ${start.toISOString()}${dryRun ? " (dry-run)" : ""}${scoped ? ` (publisher=${publisherId})` : ""}`);

    const distributionPublisherIds = scoped ? [publisherId as string] : await publisherDiffusionRuleService.findDistributionPublisherIdsForSnapshot();
    let added = 0;
    let removed = 0;

    // Resynchronise Typesense après le rebuild : chaque mission dont l'appartenance au snapshot a changé
    // (pour un diffuseur quelconque) est republiée UNE seule fois sur le bus. Comme une mission est
    // diffusée à ~150 diffuseurs, republier par ligne (mission, diffuseur) amplifiait le trafic d'un
    // facteur ~150 alors que l'upsert worker reconstruit le document complet (liste des diffuseurs
    // incluse) depuis PostgreSQL : un seul message par mission suffit. On collecte donc les missionId
    // touchés (toutes les touches, y compris la purge) dans un Set, puis on publie à la fin, une fois
    // toutes les écritures SQL convergées (chaque doc est ainsi construit depuis l'état final).
    // Récupération : un échec de publish laisse `reindexFailed>0` (success=false) sans que la ligne SQL
    // déjà écrite soit rejouée ⇒ relancer alors `update-mission-index` (réindexation complète) pour
    // reconverger Typesense sur PostgreSQL.
    const touchedMissionIds = new Set<string>();
    let reindexTouches = 0;
    const collectTouchedMissions = async (missionIds: string[]): Promise<void> => {
      for (const missionId of missionIds) {
        reindexTouches++;
        touchedMissionIds.add(missionId);
      }
    };

    for (const distributionPublisherId of distributionPublisherIds) {
      const distributionPublisher = await missionDiffusionService.rebuildForDistributionPublisher(distributionPublisherId, {
        dryRun,
        onMissionsTouched: collectTouchedMissions,
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
    // Ignorée en mode ciblé : `distributionPublisherIds` ne contient qu'un diffuseur, la purge
    // `notIn` viderait la table pour tous les autres.
    let prunedDistributionPublishers = 0;
    if (!scoped) {
      const prunedMissionIds = dryRun ? [] : await missionDiffusionRepository.findMissionIdsForDistributionPublishersNotIn(distributionPublisherIds);

      prunedDistributionPublishers = dryRun
        ? await missionDiffusionRepository.countRowsForDistributionPublishersNotIn(distributionPublisherIds)
        : await missionDiffusionRepository.deleteRowsForDistributionPublishersNotIn(distributionPublisherIds);
      removed += prunedDistributionPublishers;

      await collectTouchedMissions(prunedMissionIds);
    }

    // Publication dédupliquée : un seul message par mission distincte, après convergence des écritures.
    const distinctMissionsReindexed = touchedMissionIds.size;
    let reindexRequested = 0;
    let reindexFailed = 0;
    await Promise.all(
      Array.from(touchedMissionIds).map(async (missionId) => {
        try {
          await asyncTaskBus.publish({ type: "mission.index", payload: { missionId, action: "upsert" } });
          reindexRequested++;
        } catch (error) {
          reindexFailed++;
          captureException(error, { extra: { missionId } });
        }
      })
    );

    const durationMs = Date.now() - start.getTime();

    const mode = dryRun ? "Dry-run done" : "Done";
    console.log(
      `[MissionDiffusionRebuild] ${mode}${scoped ? ` (publisher=${publisherId})` : ""}: ${distributionPublisherIds.length} distribution publishers, +${added} / -${removed} lignes (dont ${prunedDistributionPublishers} purgées), ${reindexTouches} touches dédupliquées en ${distinctMissionsReindexed} missions réindexées (${reindexRequested} demandées, ${reindexFailed} échecs), en ${durationMs}ms`
    );

    return {
      success: reindexFailed === 0,
      timestamp: new Date(),
      distributionPublishers: distributionPublisherIds.length,
      added,
      removed,
      prunedDistributionPublishers,
      reindexTouches,
      distinctMissionsReindexed,
      reindexRequested,
      reindexFailed,
      durationMs,
      dryRun,
      publisherId,
      message: `${dryRun ? "Dry-run : " : ""}${scoped ? `1 diffuseur ciblé (${publisherId})` : `${distributionPublisherIds.length} publishers de diffusion`} rebuild : +${added} / -${removed} lignes, ${distinctMissionsReindexed} missions réindexées (${reindexTouches} touches) en ${durationMs}ms`,
    };
  }
}
