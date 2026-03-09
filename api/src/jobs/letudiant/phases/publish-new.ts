import { captureException } from "@/error";
import { PUBLISHER_SYNC_CONFIGS } from "@/jobs/letudiant/config";
import { LetudiantJobCounter, syncMission } from "@/jobs/letudiant/phases/sync-mission";
import { missionToPilotyJobs } from "@/jobs/letudiant/transformers";
import { countOnlineEntriesByDomain, getMissionIdsToPublishByDomain, getMissionIdsToPublishUnlimited, loadMissionsWithJobBoards } from "@/jobs/letudiant/utils";
import { PilotyClient } from "@/services/piloty";
import { PilotyMandatoryData } from "@/services/piloty/types";

/**
 * Phase: publish new missions
 * Iterates over all publisher configs:
 * - Publishers with quotaByDomain use the quota-based algorithm (e.g. JVA)
 * - Publishers with quotaByDomain = null are fully synced without restriction (e.g. ASC)
 */
export async function publishNewMissions(
  pilotyClient: PilotyClient,
  mandatoryData: PilotyMandatoryData,
  excludedOrgClientIds: Set<string>,
  counter: LetudiantJobCounter,
  dryRun = false
): Promise<void> {
  for (const config of PUBLISHER_SYNC_CONFIGS) {
    if (config.quotaByDomain) {
      await publishWithQuota([config.publisherId], config.quotaByDomain, pilotyClient, mandatoryData, excludedOrgClientIds, counter, dryRun);
    } else {
      await publishUnlimited([config.publisherId], pilotyClient, mandatoryData, excludedOrgClientIds, counter, dryRun);
    }
  }
}

/**
 * Publish missions for quota-based publishers (e.g. JVA).
 * Fills remaining quota slots per domain with the newest eligible missions.
 * Quota = number of Piloty entries (addresses), not missions.
 */
async function publishWithQuota(
  publisherIds: string[],
  quotaByDomain: Record<string, number>,
  pilotyClient: PilotyClient,
  mandatoryData: PilotyMandatoryData,
  excludedOrgClientIds: Set<string>,
  counter: LetudiantJobCounter,
  dryRun: boolean
): Promise<void> {
  const onlineByDomain = await countOnlineEntriesByDomain(publisherIds);

  for (const [domain, quota] of Object.entries(quotaByDomain)) {
    const currentEntries = onlineByDomain.get(domain) ?? 0;
    let remainingSlots = Math.max(0, quota - currentEntries);

    console.log(`[LetudiantHandler] Publish phase: domain "${domain}" — ${currentEntries} ONLINE, ${remainingSlots} slots remaining`);

    if (remainingSlots <= 0) {
      continue;
    }

    const candidateLimit = remainingSlots + 20;
    const missionIds = await getMissionIdsToPublishByDomain(publisherIds, domain, candidateLimit, excludedOrgClientIds);
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
        const requiredSlots = missionToPilotyJobs(mission, "quota-check", mandatoryData).length;
        if (requiredSlots > remainingSlots) {
          console.log(`[LetudiantHandler] Publish phase: skipping mission ${mission.id} for domain "${domain}" (needs ${requiredSlots} slots, only ${remainingSlots} remaining)`);
          continue;
        }
        const entriesPublished = await syncMission(pilotyClient, mission, [], mandatoryData, counter, "create", dryRun);
        remainingSlots -= entriesPublished;
      } catch (error) {
        captureException(error, { extra: { missionId: mission.id } });
        counter.error++;
      }
    }
  }
}

/**
 * Publish all eligible missions for unlimited publishers (e.g. ASC).
 * No domain filter, no quota cap — every eligible mission is synced.
 */
async function publishUnlimited(
  publisherIds: string[],
  pilotyClient: PilotyClient,
  mandatoryData: PilotyMandatoryData,
  excludedOrgClientIds: Set<string>,
  counter: LetudiantJobCounter,
  dryRun: boolean
): Promise<void> {
  const missionIds = await getMissionIdsToPublishUnlimited(publisherIds, excludedOrgClientIds);
  console.log(`[LetudiantHandler] Publish phase (unlimited): ${missionIds.length} candidate missions for publishers ${publisherIds.join(", ")}`);

  if (!missionIds.length) {
    return;
  }

  const entries = await loadMissionsWithJobBoards(missionIds);

  for (const { mission } of entries) {
    try {
      await syncMission(pilotyClient, mission, [], mandatoryData, counter, "create", dryRun);
    } catch (error) {
      captureException(error, { extra: { missionId: mission.id } });
      counter.error++;
    }
  }
}
