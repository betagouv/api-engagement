import { captureException } from "@/error";
import { LetudiantJobCounter, syncMission } from "@/jobs/letudiant/phases/sync-mission";
import { getMissionIdsToUpdate, loadMissionsWithJobBoards } from "@/jobs/letudiant/utils";
import { PilotyClient } from "@/services/piloty";
import { PilotyMandatoryData } from "@/services/piloty/types";

/**
 * Phase: update modified missions
 * Updates on Piloty all currently ONLINE missions that have been modified since the last sync.
 */
export async function updateModifiedMissions(pilotyClient: PilotyClient, mandatoryData: PilotyMandatoryData, counter: LetudiantJobCounter): Promise<void> {
  const missionIds = await getMissionIdsToUpdate();
  console.log(`[LetudiantHandler] Update phase: ${missionIds.length} missions to update`);

  if (!missionIds.length) {
    return;
  }

  const entries = await loadMissionsWithJobBoards(missionIds);

  for (const { mission, jobBoards } of entries) {
    try {
      await syncMission(pilotyClient, mission, jobBoards, mandatoryData, counter, "update");
    } catch (error) {
      captureException(error, { extra: { missionId: mission.id } });
      counter.error++;
    }
  }
}
