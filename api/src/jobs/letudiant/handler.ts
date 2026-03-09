import { LETUDIANT_PILOTY_TOKEN } from "@/config";
import { BaseHandler } from "@/jobs/base/handler";
import { MEDIA_PUBLIC_ID } from "@/jobs/letudiant/config";
import { archiveExpiredMissions } from "@/jobs/letudiant/phases/archive-expired";
import { publishNewMissions } from "@/jobs/letudiant/phases/publish-new";
import { LetudiantJobCounter } from "@/jobs/letudiant/phases/sync-mission";
import { updateModifiedMissions } from "@/jobs/letudiant/phases/update-modified";
import { getMandatoryData, loadExcludedOrganizationClientIds } from "@/jobs/letudiant/utils";
import { JobResult } from "@/jobs/types";
import { PilotyClient } from "@/services/piloty";

export interface LetudiantJobPayload {
  id?: string;
  dryRun?: boolean;
}

export interface LetudiantJobResult extends JobResult {
  counter: {
    archived: number;
    updated: number;
    published: number;
    skipped: number;
    error: number;
  };
}

/**
 * Main class handler for L'Etudiant
 * Orchestrates 3 phases:
 * 1. Archive expired/invalid/excluded missions
 * 2. Update missions modified since last sync
 * 3. Publish new missions within domain quotas
 */
export class LetudiantHandler implements BaseHandler<LetudiantJobPayload, LetudiantJobResult> {
  name = "Sync des missions L'Etudiant";

  public async handle(_payload: LetudiantJobPayload): Promise<LetudiantJobResult> {
    const dryRun = !!_payload.dryRun;
    const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);
    const counter: LetudiantJobCounter = { archived: 0, updated: 0, published: 0, skipped: 0, error: 0 };

    if (dryRun) {
      console.log("[LetudiantHandler] DRY RUN — no Piloty API calls or DB writes will be made");
    }

    const excludedOrgClientIds = await loadExcludedOrganizationClientIds();
    console.log(`[LetudiantHandler] Loaded ${excludedOrgClientIds.size} excluded organizations`);

    await archiveExpiredMissions(pilotyClient, excludedOrgClientIds, counter, dryRun);

    const mandatoryData = await getMandatoryData(pilotyClient);

    await updateModifiedMissions(pilotyClient, mandatoryData, counter, dryRun);
    await publishNewMissions(pilotyClient, mandatoryData, excludedOrgClientIds, counter, dryRun);

    return {
      success: true,
      timestamp: new Date(),
      counter,
      message: buildMessage(counter),
    };
  }
}

function buildMessage(counter: LetudiantJobCounter): string {
  return [
    `\t• Entrées archivées : ${counter.archived}`,
    `\t• Missions mises à jour : ${counter.updated}`,
    `\t• Nouvelles missions publiées : ${counter.published}`,
    `\t• Missions ignorées : ${counter.skipped}`,
    `\t• Erreurs : ${counter.error}`,
  ].join("\n");
}
