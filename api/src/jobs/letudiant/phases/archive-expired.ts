import { captureException } from "@/error";
import { LetudiantJobCounter } from "@/jobs/letudiant/phases/sync-mission";
import { LETUDIANT_JOB_BOARD_ID, getMissionEntriesToArchive, rateLimit } from "@/jobs/letudiant/utils";
import missionJobBoardService from "@/services/mission-jobboard";
import { PilotyClient, PilotyError } from "@/services/piloty";

/**
 * Phase: archive expired missions
 * Archives on Piloty all currently ONLINE entries that are no longer valid:
 * - mission deleted or not ACCEPTED
 * - entry has been ONLINE for more than 30 days
 * - mission's organization is excluded for L'Etudiant
 */
export async function archiveExpiredMissions(pilotyClient: PilotyClient, excludedOrgClientIds: Set<string>, counter: LetudiantJobCounter): Promise<void> {
  const entries = await getMissionEntriesToArchive(excludedOrgClientIds);
  console.log(`[LetudiantHandler] Archive phase: ${entries.length} entries to archive`);

  for (const entry of entries) {
    try {
      console.log(`[LetudiantHandler] Archiving entry ${entry.publicId} (mission ${entry.missionId})`);
      await pilotyClient.updateJob(entry.publicId, { state: "archived" } as any);
      await missionJobBoardService.upsert({
        jobBoardId: LETUDIANT_JOB_BOARD_ID,
        missionId: entry.missionId,
        missionAddressId: entry.missionAddressId,
        publicId: entry.publicId,
        syncStatus: "OFFLINE",
      });
      counter.archived++;
      await rateLimit();
    } catch (error: any) {
      if (error instanceof PilotyError && error.status === 404) {
        // Already gone from Piloty — mark OFFLINE anyway
        console.log(`[LetudiantHandler] Entry ${entry.publicId} not found on Piloty (404), marking OFFLINE`);
        await missionJobBoardService.upsert({
          jobBoardId: LETUDIANT_JOB_BOARD_ID,
          missionId: entry.missionId,
          missionAddressId: entry.missionAddressId,
          publicId: entry.publicId,
          syncStatus: "OFFLINE",
          comment: "404 on archive",
        });
        counter.archived++;
      } else {
        captureException(error, { extra: { missionId: entry.missionId, publicId: entry.publicId } });
        counter.error++;
      }
    }
  }
}
