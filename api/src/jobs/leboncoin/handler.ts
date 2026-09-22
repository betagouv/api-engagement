import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { LEBONCOIN_BENEVOLAT_USER_ID, LEBONCOIN_SC_USER_ID } from "@/jobs/leboncoin/config";
import { missionToBenevolatOffer, missionToServiceCiviqueOffer, missionToSpvOffer } from "@/jobs/leboncoin/transformers";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { generateXML, storeXML } from "@/jobs/leboncoin/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { buildWhere, missionService } from "@/services/mission";
import { publisherService } from "@/services/publisher";
import { PublisherMissionType } from "@/types/publisher";

// Quotas : les N missions les plus récentes diffusées à leboncoin (SPV borné par mission_diffusion).
const SERVICE_CIVIQUE_MAX_OFFERS = 1000;
const JVA_BENEVOLAT_MAX_OFFERS = 1000;

export interface LeboncoinJobPayload {}

export interface LeboncoinJobResult extends JobResult {
  serviceCivique?: { sent: number; url: string };
  benevolat?: { spv: number; jva: number; url: string };
}

export class LeboncoinHandler implements BaseHandler<LeboncoinJobPayload, LeboncoinJobResult> {
  name = "Génération des feeds Leboncoin";

  public async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();
    try {
      if (ENV !== "development" && (!LEBONCOIN_SC_USER_ID || !LEBONCOIN_BENEVOLAT_USER_ID)) {
        throw new Error("LEBONCOIN_SC_USER_ID / LEBONCOIN_BENEVOLAT_USER_ID non renseignés dans la config");
      }

      const serviceCivique = await this.buildServiceCiviqueFeed(start);
      const benevolat = await this.buildBenevolatFeed(start);

      return {
        success: true,
        timestamp: new Date(),
        serviceCivique,
        benevolat,
        message: `\t• Service Civique : ${serviceCivique.sent} offres\n\t• Bénévolat : ${benevolat.spv} SPV + ${benevolat.jva} JeVeuxAider offres`,
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

    const offers = missions.map(missionToServiceCiviqueOffer).filter((offer): offer is LeboncoinOffer => offer !== null);
    const url = await this.publish(offers, "leboncoin-service-civique", "LEBONCOIN_SERVICE_CIVIQUE", start);
    console.log(`[Leboncoin] Service Civique: ${missions.length} missions, ${offers.length} offres`);
    return { sent: offers.length, url };
  }

  /** Bénévolat (rubrique Bénévolat) : offres SPV (1/département) + offres JeVeuxAider (1/mission). */
  private async buildBenevolatFeed(start: Date): Promise<{ spv: number; jva: number; url: string }> {
    const spvOffers = await this.buildSpvOffers();
    const jvaOffers = await this.buildJvaOffers();

    const url = await this.publish([...spvOffers, ...jvaOffers], "leboncoin-benevolat", "LEBONCOIN_BENEVOLAT", start);
    console.log(`[Leboncoin] Bénévolat: ${spvOffers.length} SPV + ${jvaOffers.length} JeVeuxAider offres`);
    return { spv: spvOffers.length, jva: jvaOffers.length, url };
  }

  private async buildSpvOffers(): Promise<LeboncoinOffer[]> {
    const spvPublishers = await publisherService.findPublishers({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
    const spvPublisherIds = spvPublishers.map((publisher) => publisher.id);
    if (!spvPublisherIds.length) {
      return [];
    }
    const where = await buildWhere({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: spvPublisherIds, statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { orderBy: { createdAt: Prisma.SortOrder.desc } });
    return missions.map(missionToSpvOffer).filter((offer): offer is LeboncoinOffer => offer !== null);
  }

  private async buildJvaOffers(): Promise<LeboncoinOffer[]> {
    const where = await buildWhere({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: [PUBLISHER_IDS.JEVEUXAIDER], statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { limit: JVA_BENEVOLAT_MAX_OFFERS, orderBy: { createdAt: Prisma.SortOrder.desc } });
    return missions.map(missionToBenevolatOffer).filter((offer): offer is LeboncoinOffer => offer !== null);
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
