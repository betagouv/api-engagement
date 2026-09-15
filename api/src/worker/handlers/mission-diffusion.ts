import { asyncTaskBus } from "@/services/async-task";
import { missionDiffusionService } from "@/services/mission-diffusion";

export const handleMissionDiffusion = async (payload: { missionId: string }) => {
  const startedAt = Date.now();
  console.log(`[mission.diffusion] start missionId=${payload.missionId}`);

  try {
    const { desired, added, removed } = await missionDiffusionService.rebuildForMission(payload.missionId);

    // Réindexe APRÈS l'écriture des lignes pour propager `distributionPublisherIds` à Typesense.
    // Le chaînage (et non un index émis en parallèle côté appelant) garantit que le document reconstruit
    // depuis Postgres voit bien les lignes qu'on vient d'écrire.
    await asyncTaskBus.publish({ type: "mission.index", payload: { missionId: payload.missionId, action: "upsert" } });

    console.log(`[mission.diffusion] done missionId=${payload.missionId} desired=${desired} +${added}/-${removed} durationMs=${Date.now() - startedAt}`);
  } catch (error) {
    console.error(`[mission.diffusion] failed missionId=${payload.missionId} durationMs=${Date.now() - startedAt}`);
    throw error;
  }
};
