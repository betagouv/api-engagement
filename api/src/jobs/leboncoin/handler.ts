import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { missionToOffer } from "@/jobs/leboncoin/transformers";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { generateXML, storeXML } from "@/jobs/leboncoin/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { buildWhere, missionService } from "@/services/mission";
import { publisherService } from "@/services/publisher";
import { PublisherMissionType } from "@/types/publisher";

// Quota Service Civique : les 1000 missions les plus récentes diffusées à leboncoin.
// SPV et JeVeuxAider ne sont pas plafonnés (bornés par mission_diffusion).
const SERVICE_CIVIQUE_MAX_OFFERS = 1000;

export interface LeboncoinJobPayload {}

export interface LeboncoinJobResult extends JobResult {
  serviceCivique?: { sent: number; url: string };
  spv?: { sent: number; url: string };
  jva?: { sent: number; url: string };
}

// Chaque flux ne diffuse que les missions présentes dans `mission_diffusion` pour LEBONCOIN :
// c'est le paramètre `diffuseurPublisherId` de `buildWhere` qui applique ce filtre
// (`missionDiffusions.some.distributionPublisherId = LEBONCOIN`, cf. services/mission.ts).
export class LeboncoinHandler implements BaseHandler<LeboncoinJobPayload, LeboncoinJobResult> {
  name = "Génération des feeds Leboncoin";

  public async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();
    try {
      const serviceCivique = await this.buildServiceCiviqueFeed(start);
      const spv = await this.buildSpvFeed(start);
      const jva = await this.buildJvaFeed(start);

      return {
        success: true,
        timestamp: new Date(),
        serviceCivique,
        spv,
        jva,
        message: `\t• Service Civique : ${serviceCivique.sent} offres\n\t• Sapeurs-Pompiers : ${spv.sent} offres\n\t• JeVeuxAider : ${jva.sent} offres`,
      };
    } catch (error) {
      captureException(error);
      await importService.createImport({
        name: "LEBONCOIN",
        publisherId: PUBLISHER_IDS.LEBONCOIN,
        startedAt: start,
        finishedAt: new Date(),
        status: "FAILED",
        failed: { data: [] },
      });
      return { success: false, timestamp: new Date() };
    }
  }

  /** SC (rubrique Stage) : les 1000 missions Service Civique les plus récentes diffusées à leboncoin. */
  private async buildServiceCiviqueFeed(start: Date): Promise<{ sent: number; url: string }> {
    const where = await buildWhere({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: [PUBLISHER_IDS.SERVICE_CIVIQUE], statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { limit: SERVICE_CIVIQUE_MAX_OFFERS, orderBy: { createdAt: Prisma.SortOrder.desc } });

    const offers = missions.map((mission) => missionToOffer(mission, "service-civique")).filter((offer): offer is LeboncoinOffer => offer !== null);
    const url = await this.publish(offers, "leboncoin-service-civique", "LEBONCOIN_SERVICE_CIVIQUE", start);
    console.log(`[Leboncoin] Service Civique: ${missions.length} missions, ${offers.length} offres`);
    return { sent: offers.length, url };
  }

  /** SPV (rubrique Bénévolat) : 1 offre par département, périmètre piloté par mission_diffusion. */
  private async buildSpvFeed(start: Date): Promise<{ sent: number; url: string }> {
    const spvPublishers = await publisherService.findPublishers({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
    const spvPublisherIds = spvPublishers.map((publisher) => publisher.id);

    let offers: LeboncoinOffer[] = [];
    if (spvPublisherIds.length) {
      const where = await buildWhere({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: spvPublisherIds, statusCode: "ACCEPTED", limit: 0, skip: 0 });
      const missions = await missionService.findMissionsBy(where, { orderBy: { createdAt: Prisma.SortOrder.desc } });
      offers = missions.map((mission) => missionToOffer(mission, "spv")).filter((offer): offer is LeboncoinOffer => offer !== null);
    }

    const url = await this.publish(offers, "leboncoin-spv", "LEBONCOIN_SPV", start);
    console.log(`[Leboncoin] SPV: ${offers.length} offres (départements)`);
    return { sent: offers.length, url };
  }

  /** JeVeuxAider (rubrique Bénévolat) : 1 offre par mission, toutes les missions actives diffusées à leboncoin. */
  private async buildJvaFeed(start: Date): Promise<{ sent: number; url: string }> {
    const where = await buildWhere({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: [PUBLISHER_IDS.JEVEUXAIDER], statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { orderBy: { createdAt: Prisma.SortOrder.desc } });

    const offers = missions.map((mission) => missionToOffer(mission, "jva")).filter((offer): offer is LeboncoinOffer => offer !== null);
    const url = await this.publish(offers, "leboncoin-jeveuxaider", "LEBONCOIN_JEVEUXAIDER", start);
    console.log(`[Leboncoin] JeVeuxAider: ${missions.length} missions, ${offers.length} offres`);
    return { sent: offers.length, url };
  }

  /** Génère le XML puis l'écrit en local (dev) ou le publie sur S3 + trace un import (prod). */
  private async publish(offers: LeboncoinOffer[], slug: string, importName: string, start: Date): Promise<string> {
    const xml = generateXML(offers);

    if (ENV === "development") {
      fs.writeFileSync(`${slug}.xml`, xml);
      return `file://${slug}.xml`;
    }

    const url = await storeXML(xml, slug);
    await importService.createImport({
      name: importName,
      publisherId: PUBLISHER_IDS.LEBONCOIN,
      createdCount: offers.length,
      startedAt: start,
      finishedAt: new Date(),
      status: "SUCCESS",
      failed: { data: [] },
    });
    return url;
  }
}
