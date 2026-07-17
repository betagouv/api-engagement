import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionDiffusionService } from "@/services/mission-diffusion";

export interface MissionDiffusionRebuildJobPayload {}

export interface MissionDiffusionRebuildJobResult extends JobResult {
  diffusers?: number;
  added?: number;
  removed?: number;
  prunedDiffusers?: number;
  durationMs?: number;
}

/*
Reconstruit périodiquement la table `mission_diffusion` (snapshot batch du résultat d'évaluation des
diffusion rules). Recompute complet par diff (par diffuseur), idempotent et relançable ; les
compteurs added/removed servent de métrique de drift. Aucune fraîcheur temps réel : la fenêtre de
staleness (6h+) fait partie du contrat produit. À ordonnancer en singleton (pas de rebuilds
concurrents) ; le diff idempotent absorbe un chevauchement éventuel sans corruption.
*/
export class MissionDiffusionRebuildHandler implements BaseHandler<MissionDiffusionRebuildJobPayload, MissionDiffusionRebuildJobResult> {
  name = "Rebuild table de diffusion (mission_diffusion)";

  async handle(_payload: MissionDiffusionRebuildJobPayload = {}): Promise<MissionDiffusionRebuildJobResult> {
    const start = new Date();
    console.log(`[MissionDiffusionRebuild] Starting at ${start.toISOString()}`);

    const result = await missionDiffusionService.rebuildAll();

    for (const diffuser of result.perDiffuser) {
      console.log(
        `[MissionDiffusionRebuild] diffuser=${diffuser.diffuserPublisherId} desired=${diffuser.desired} added=${diffuser.added} removed=${diffuser.removed} in ${diffuser.durationMs}ms`
      );
    }

    console.log(
      `[MissionDiffusionRebuild] Done: ${result.diffusers} diffusers, +${result.added} / -${result.removed} lignes (dont ${result.prunedDiffusers} purgées), en ${result.durationMs}ms`
    );

    return {
      success: true,
      timestamp: new Date(),
      diffusers: result.diffusers,
      added: result.added,
      removed: result.removed,
      prunedDiffusers: result.prunedDiffusers,
      durationMs: result.durationMs,
      message: `${result.diffusers} diffuseurs rebuild : +${result.added} / -${result.removed} lignes en ${result.durationMs}ms`,
    };
  }
}
