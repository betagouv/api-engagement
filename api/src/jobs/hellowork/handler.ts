import fs from "fs";
import { z } from "zod";

import { ENV } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { HELLOWORK_MAX_OFFERS_PER_ANNONCEUR } from "@/jobs/hellowork/config";
import { missionToOffer } from "@/jobs/hellowork/transformers";
import { HelloworkOffer } from "@/jobs/hellowork/types";
import { generateXML, storeXML } from "@/jobs/hellowork/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { getMissionsCursor } from "@/utils/mission-cursor";

const payloadSchema = z.object({ publisherId: z.string().min(1) });

// `publisherId` = diffuseur du flux (Hellowork, Jobijoba…) : un lancement du job = un flux.
export type HelloworkJobPayload = z.infer<typeof payloadSchema>;

export interface HelloworkJobResult extends JobResult {
  url?: string;
  counter: { processed: number; sent: number; skipped: number };
}

// Le périmètre n'est pas restreint dans le code : seul le snapshot `mission_diffusion` du diffuseur
// (paramètre `diffuseurPublisherId` de `buildWhere`) décide des missions diffusées.
export class HelloworkHandler implements BaseHandler<HelloworkJobPayload, HelloworkJobResult> {
  name = "Génération du feed Hellowork";

  public async handle(payload: HelloworkJobPayload): Promise<HelloworkJobResult> {
    const start = new Date();
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("[Hellowork] paramètres invalides : publisherId requis");
      return { success: false, timestamp: start, url: "", counter: { processed: 0, sent: 0, skipped: 0 }, message: "Paramètre publisherId requis" };
    }
    const { publisherId } = parsed.data;
    const counter = { processed: 0, sent: 0, skipped: 0 };
    try {
      const offers: HelloworkOffer[] = [];
      const missions = getMissionsCursor({ diffuseurPublisherId: publisherId, statusCode: "ACCEPTED" }, { orderBy: { createdAt: Prisma.SortOrder.desc } });
      const sentByAnnonceur = new Map<string, number>();
      for await (const mission of missions) {
        counter.processed++;
        const offer = missionToOffer(mission, publisherId);
        // Plafond par annonceur, sur les plus récentes (le curseur est trié par createdAt desc).
        const sent = sentByAnnonceur.get(mission.publisherId) ?? 0;
        if (offer && sent < HELLOWORK_MAX_OFFERS_PER_ANNONCEUR) {
          sentByAnnonceur.set(mission.publisherId, sent + 1);
          offers.push(offer);
        } else {
          counter.skipped++;
        }
      }
      counter.sent = offers.length;

      const xml = generateXML(offers);
      let url: string;
      if (ENV === "development") {
        const file = `hellowork-${publisherId}.xml`;
        fs.writeFileSync(file, xml);
        url = `file://${file}`;
      } else {
        url = await storeXML(xml, publisherId);
        await this.recordImport(publisherId, "SUCCESS", offers.length, start);
      }
      console.log(`[Hellowork ${publisherId}] ${offers.length} offres (${counter.skipped} ignorées) : ${url}`);

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
        await this.recordImport(publisherId, "FAILED", 0, start);
      } catch (importError) {
        captureException(importError);
      }
      return { success: false, timestamp: new Date(), url: "", counter };
    }
  }

  private async recordImport(publisherId: string, status: "SUCCESS" | "FAILED", createdCount: number, start: Date): Promise<void> {
    if (ENV === "development") {
      return;
    }
    await importService.createImport({
      name: "HELLOWORK",
      publisherId,
      createdCount,
      startedAt: start,
      finishedAt: new Date(),
      status,
      failed: { data: [] },
    });
  }
}
