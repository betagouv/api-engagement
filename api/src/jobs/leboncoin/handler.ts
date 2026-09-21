import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import {
  LEBONCOIN_PUBLISHER_ID,
  LEBONCOIN_SC_USER_ID,
  LEBONCOIN_SC_XML_URL,
  LEBONCOIN_SPV_USER_ID,
  LEBONCOIN_SPV_XML_URL,
  SERVICE_CIVIQUE_MAX_OFFERS,
  SERVICE_CIVIQUE_PUBLISHER_ID,
} from "@/jobs/leboncoin/config";
import { missionToServiceCiviqueOffer, missionToSpvOffer } from "@/jobs/leboncoin/transformers";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { generateXML, storeXML } from "@/jobs/leboncoin/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { buildWhere, missionService } from "@/services/mission";
import { publisherService } from "@/services/publisher";
import { PublisherMissionType } from "@/types/publisher";

export interface LeboncoinJobPayload {}

export interface LeboncoinJobResult extends JobResult {
  serviceCivique?: { processed: number; sent: number; url: string };
  spv?: { processed: number; sent: number; url: string };
}

export class LeboncoinHandler implements BaseHandler<LeboncoinJobPayload, LeboncoinJobResult> {
  name = "Génération des feeds Leboncoin";

  public async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();
    try {
      if (!LEBONCOIN_SC_USER_ID || !LEBONCOIN_SPV_USER_ID) {
        // Les user_id de compte leboncoin sont indispensables : sans eux les offres seraient rejetées.
        throw new Error("LEBONCOIN_SC_USER_ID / LEBONCOIN_SPV_USER_ID manquants (variables d'environnement)");
      }

      const sc = await this.buildServiceCiviqueFeed(start);
      const spv = await this.buildSpvFeed(start);

      return {
        success: true,
        timestamp: new Date(),
        serviceCivique: sc,
        spv,
        message: `\t• Service Civique : ${sc.sent} offres (sur ${sc.processed} missions)\n\t• Sapeurs-Pompiers : ${spv.sent} offres (sur ${spv.processed} missions)`,
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
  private async buildServiceCiviqueFeed(start: Date): Promise<{ processed: number; sent: number; url: string }> {
    const where = await buildWhere({ diffuseurPublisherId: LEBONCOIN_PUBLISHER_ID, publisherIds: [SERVICE_CIVIQUE_PUBLISHER_ID], statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { limit: SERVICE_CIVIQUE_MAX_OFFERS, orderBy: { createdAt: Prisma.SortOrder.desc } });

    const offers: LeboncoinOffer[] = [];
    for (const mission of missions) {
      const offer = missionToServiceCiviqueOffer(mission);
      if (offer) {
        offers.push(offer);
      }
    }

    const url = await this.publish(offers, "leboncoin-service-civique", LEBONCOIN_SC_XML_URL, start);
    console.log(`[Leboncoin] Service Civique: ${missions.length} missions traitées, ${offers.length} offres`);
    return { processed: missions.length, sent: offers.length, url };
  }

  /** SPV (rubrique Bénévolat) : 1 offre par département, périmètre piloté par mission_diffusion. */
  private async buildSpvFeed(start: Date): Promise<{ processed: number; sent: number; url: string }> {
    const spvPublishers = await publisherService.findPublishers({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
    const spvPublisherIds = spvPublishers.map((publisher) => publisher.id);
    if (!spvPublisherIds.length) {
      const url = await this.publish([], "leboncoin-spv", LEBONCOIN_SPV_XML_URL, start);
      return { processed: 0, sent: 0, url };
    }

    const where = await buildWhere({ diffuseurPublisherId: LEBONCOIN_PUBLISHER_ID, publisherIds: spvPublisherIds, statusCode: "ACCEPTED", limit: 0, skip: 0 });
    const missions = await missionService.findMissionsBy(where, { orderBy: { createdAt: Prisma.SortOrder.desc } });

    // Une offre par département : les missions étant triées du plus récent au plus ancien,
    // on garde la première rencontrée pour chaque `partner_unique_reference` (= spv-{code}).
    const byDepartment = new Map<string, LeboncoinOffer>();
    for (const mission of missions) {
      const offer = missionToSpvOffer(mission);
      if (offer && !byDepartment.has(offer.partner_unique_reference)) {
        byDepartment.set(offer.partner_unique_reference, offer);
      }
    }
    const offers = Array.from(byDepartment.values());

    const url = await this.publish(offers, "leboncoin-spv", LEBONCOIN_SPV_XML_URL, start);
    console.log(`[Leboncoin] SPV: ${missions.length} missions traitées, ${offers.length} offres (départements)`);
    return { processed: missions.length, sent: offers.length, url };
  }

  /** Génère le XML puis l'écrit en local (dev) ou le publie sur S3 + trace un import (prod). */
  private async publish(offers: LeboncoinOffer[], slug: string, baseUrl: string, start: Date): Promise<string> {
    const xml = generateXML(offers);

    if (ENV === "development") {
      fs.writeFileSync(`${slug}.xml`, xml);
      return `file://${slug}.xml`;
    }

    const url = await storeXML(xml, slug, baseUrl);
    await importService.createImport({
      name: slug === "leboncoin-spv" ? "LEBONCOIN_SPV" : "LEBONCOIN_SERVICE_CIVIQUE",
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
