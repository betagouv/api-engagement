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
import { GrimpioJob } from "@/jobs/grimpio/types";
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

      // Les annonceurs de grimpio sont configurés en DB via les diffusion rules
      // (un scope-root `field=publisherId` par annonceur). On les énumère pour
      // construire l'allowlist des publishers dont grimpio peut diffuser les missions.
      const scopeRoots = await publisherDiffusionRuleService.findRules({
        publisherId: GRIMPIO_PUBLISHER_ID,
        combinedWithId: null,
        field: "publisherId",
      });
      const annonceurPublisherIds = [...new Set(scopeRoots.map((rule) => rule.value))];

      // Sans annonceur configuré, aucune mission n'est candidate. On évite surtout
      // d'appeler getMissionsCursor avec un publisherIds vide (buildWhere ignorerait
      // le filtre et renverrait toutes les missions ACCEPTED).
      const jobsByPublisher = new Map<string, GrimpioJob[]>();
      if (annonceurPublisherIds.length > 0) {
        console.log(`[Grimpio Job] Querying candidate missions for ${annonceurPublisherIds.length} annonceur(s)`);
        const missionsCursor = getMissionsCursor({ publisherIds: annonceurPublisherIds });
        const generated = await generateJobsByPublisher(missionsCursor);
        for (const [publisherId, jobs] of generated.jobsByPublisher) {
          jobsByPublisher.set(publisherId, jobs);
        }
        counter.processed = generated.processed;
        counter.expired = generated.expired;
      } else {
        console.log(`[Grimpio Job] No annonceur configured for grimpio, skipping mission query`);
      }

      // Garantit un feed (même vide) pour chaque annonceur configuré, afin de
      // vider proprement le flux Grimp d'un publisher sans mission.
      for (const publisherId of annonceurPublisherIds) {
        if (!jobsByPublisher.has(publisherId)) {
          jobsByPublisher.set(publisherId, []);
        }
      }

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
