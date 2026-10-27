import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { HELLOWORK_MAX_OFFERS } from "@/jobs/hellowork/config";
import { missionToOffer } from "@/jobs/hellowork/transformers";
import { HelloworkOffer } from "@/jobs/hellowork/types";
import { generateXML, storeXML } from "@/jobs/hellowork/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { getMissionsCursor } from "@/utils/mission-cursor";

export interface HelloworkJobPayload {}

export interface HelloworkJobResult extends JobResult {
  url?: string;
  counter: { processed: number; sent: number; skipped: number };
}

// Le périmètre n'est pas restreint dans le code : seul le snapshot `mission_diffusion` de HELLOWORK
// (paramètre `diffuseurPublisherId` de `buildWhere`) décide des missions diffusées. Le transformer
// ne formate que les dispositifs gérés (Service Civique) et ignore les autres.
export class HelloworkHandler implements BaseHandler<HelloworkJobPayload, HelloworkJobResult> {
  name = "Génération du feed Hellowork";

  public async handle(): Promise<HelloworkJobResult> {
    const start = new Date();
    const counter = { processed: 0, sent: 0, skipped: 0 };
    try {
      const offers: HelloworkOffer[] = [];
      const missions = getMissionsCursor(
        { diffuseurPublisherId: PUBLISHER_IDS.HELLOWORK, statusCode: "ACCEPTED" },
        { limit: HELLOWORK_MAX_OFFERS, orderBy: { createdAt: Prisma.SortOrder.desc } }
      );
      for await (const mission of missions) {
        counter.processed++;
        const offer = missionToOffer(mission);
        if (offer) {
          offers.push(offer);
        } else {
          counter.skipped++;
        }
      }
      counter.sent = offers.length;

      const xml = generateXML(offers);
      let url: string;
      if (ENV === "development") {
        fs.writeFileSync("hellowork.xml", xml);
        url = "file://hellowork.xml";
      } else {
        url = await storeXML(xml);
        await this.recordImport("SUCCESS", offers.length, start);
      }
      console.log(`[Hellowork] ${offers.length} offres (${counter.skipped} ignorées) : ${url}`);

      return {
        success: true,
        timestamp: new Date(),
        url,
        counter,
        message: `\t• Missions traitées : ${counter.processed}\n\t• Offres dans le flux : ${counter.sent}\n\t• Missions ignorées : ${counter.skipped}`,
      };
    } catch (error) {
      captureException(error);
      console.error("[Hellowork] génération en échec", error);
      // La trace d'échec ne doit jamais masquer le résultat du job.
      try {
        await this.recordImport("FAILED", 0, start);
      } catch (importError) {
        captureException(importError);
      }
      return { success: false, timestamp: new Date(), url: "", counter };
    }
  }

  private async recordImport(status: "SUCCESS" | "FAILED", createdCount: number, start: Date): Promise<void> {
    if (ENV === "development") {
      return;
    }
    await importService.createImport({
      name: "HELLOWORK",
      publisherId: PUBLISHER_IDS.HELLOWORK,
      createdCount,
      startedAt: start,
      finishedAt: new Date(),
      status,
      failed: { data: [] },
    });
  }
}
