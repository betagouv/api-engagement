import { captureException } from "@/error";
import { ELIGIBLE_DOMAINS, QUOTA_BY_DOMAIN } from "@/jobs/letudiant/config";
import { LetudiantJobCounter, syncMission } from "@/jobs/letudiant/phases/sync-mission";
import { countOnlineEntriesByDomain, getMissionIdsToPublish, loadMissionsWithJobBoards } from "@/jobs/letudiant/utils";
import { PilotyClient } from "@/services/piloty";
import { PilotyMandatoryData } from "@/services/piloty/types";

/**
 * Phase: publish new missions
 * Fills remaining quota slots per domain with the newest eligible missions.
 * Quota = number of Piloty entries (addresses), not missions.
 * Distribution: solidarite-insertion (1800), sport (750), benevolat-competences (450).
 */
export async function publishNewMissions(
  pilotyClient: PilotyClient,
  mandatoryData: PilotyMandatoryData,
  excludedOrgClientIds: Set<string>,
  counter: LetudiantJobCounter,
  dryRun = false
): Promise<void> {
  const onlineByDomain = await countOnlineEntriesByDomain();

  for (const domain of ELIGIBLE_DOMAINS) {
    const currentEntries = onlineByDomain.get(domain) ?? 0;
    let remainingSlots = Math.max(0, QUOTA_BY_DOMAIN[domain] - currentEntries);

    console.log(`[LetudiantHandler] Publish phase: domain "${domain}" — ${currentEntries} ONLINE, ${remainingSlots} slots remaining`);

    if (remainingSlots <= 0) {
      continue;
    }

    const missionIds = await getMissionIdsToPublish(domain, remainingSlots, excludedOrgClientIds);
    console.log(`[LetudiantHandler] Publish phase: ${missionIds.length} candidate missions for domain "${domain}"`);

    if (!missionIds.length) {
      continue;
    }

    const entries = await loadMissionsWithJobBoards(missionIds);

    for (const { mission } of entries) {
      if (remainingSlots <= 0) {
        break;
      }

      try {
        const entriesPublished = await syncMission(pilotyClient, mission, [], mandatoryData, counter, "create", dryRun);
        remainingSlots -= entriesPublished;
      } catch (error) {
        captureException(error, { extra: { missionId: mission.id } });
        counter.error++;
      }
    }
  }
}
