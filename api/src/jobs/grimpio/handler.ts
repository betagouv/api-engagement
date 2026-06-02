/**
 * Grimpio job handler
 * usefull links:
 * https://api.grimp.io/partner/education/doc/#/
 * https://grimp.notion.site/Diffuser-vos-offres-sur-Grimp-Guide-d-int-gration-jobboard-17b7e6e6c363805da6a3c5bd40ed4976
 */

import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { GRIMPIO_PUBLISHER_ID } from "@/jobs/grimpio/config";
import { generateJobsByPublisher, generateXML, getMissionsCursor, storeXML } from "@/jobs/grimpio/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

export interface GrimpioJobPayload {}

export interface GrimpioJobResult extends JobResult {
  feeds?: { publisherId: string; url: string; sent: number }[];
  counter: {
    processed: number;
    sent: number;
    expired: number;
  };
}

export class GrimpioHandler implements BaseHandler<GrimpioJobPayload, GrimpioJobResult> {
  name = "Génération du feed Grimpio";

  public async handle(payload: GrimpioJobPayload): Promise<GrimpioJobResult> {
    const start = new Date();
    try {
      const grimpio = await publisherService.findOnePublisherById(GRIMPIO_PUBLISHER_ID);
      if (!grimpio) {
        throw new Error("Grimpio publisher not found");
      }

      const counter = {
        processed: 0,
        sent: 0,
        expired: 0,
      };

      // Where des missions candidates de grimpio (allowlist des annonceurs +
      // leurs critères/exclusions), construit depuis ses diffusion rules.
      const candidateWhere = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere(GRIMPIO_PUBLISHER_ID);
      if (Object.keys(candidateWhere).length === 0) {
        console.log(`[Grimpio Job] No annonceur configured for grimpio, nothing to diffuse`);
        return { success: true, timestamp: new Date(), feeds: [], counter };
      }

      console.log(`[Grimpio Job] Querying candidate missions`);
      // publisherIds: [] satisfait le type (requis) sans ajouter de filtre — l'allowlist
      // est portée par directFilters (candidateWhere).
      const { jobsByPublisher, processed, expired } = await generateJobsByPublisher(getMissionsCursor({ directFilters: candidateWhere, publisherIds: [] }));
      counter.processed = processed;
      counter.expired = expired;

      const feeds: { publisherId: string; url: string; sent: number }[] = [];

      for (const [publisherId, jobs] of jobsByPublisher) {
        console.log(`[Grimpio Job] Generating XML for publisher ${publisherId} (${jobs.length} jobs)`);
        const xml = generateXML(jobs);
        counter.sent += jobs.length;

        if (ENV === "development") {
          fs.writeFileSync(`grimpio-${publisherId}.xml`, xml);
          console.log(`[Grimpio Job] XML stored in local file grimpio-${publisherId}.xml`);
          feeds.push({ publisherId, url: `file://grimpio-${publisherId}.xml`, sent: jobs.length });
          continue;
        }

        const url = await storeXML(xml, publisherId);
        console.log(`[Grimpio Job] XML stored at ${url}`);
        feeds.push({ publisherId, url, sent: jobs.length });

        await importService.createImport({
          name: `GRIMPIO-${publisherId}`,
          publisherId: PUBLISHER_IDS.GRIMPIO,
          createdCount: jobs.length,
          updatedCount: 0,
          deletedCount: 0,
          missionCount: 0,
          refusedCount: 0,
          startedAt: start,
          finishedAt: new Date(),
          status: "SUCCESS",
          failed: { data: [] },
        });
      }

      return {
        success: true,
        timestamp: new Date(),
        feeds,
        counter,
        message: `\t• Nombre de feeds générés: ${feeds.length}\n\t• Nombre de missions traitées: ${counter.processed}\n\t• Nombre de missions envoyées dans les feeds: ${counter.sent}\n\t• Nombre de missions expirées: ${counter.expired}`,
      };
    } catch (error) {
      captureException(error);
      if (error instanceof Error && error.message.includes("Grimpio publisher not found")) {
        return {
          success: false,
          timestamp: new Date(),
          feeds: [],
          counter: { processed: 0, sent: 0, expired: 0 },
        };
      }

      await importService.createImport({
        name: `GRIMPIO`,
        publisherId: PUBLISHER_IDS.GRIMPIO,
        startedAt: start,
        finishedAt: new Date(),
        status: "FAILED",
        failed: { data: [] },
      });

      return {
        success: false,
        timestamp: new Date(),
        feeds: [],
        counter: { processed: 0, sent: 0, expired: 0 },
      };
    }
  }
}
