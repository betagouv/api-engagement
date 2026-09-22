import fs from "fs";

import { ENV, PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { getMissionsCursor } from "@/jobs/base/missions-cursor";
import { Dispositif, missionToOffer } from "@/jobs/leboncoin/transformers";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { generateXML, storeXML } from "@/jobs/leboncoin/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { publisherService } from "@/services/publisher";
import { MissionSearchFilters } from "@/types/mission";
import { PublisherMissionType } from "@/types/publisher";

// Quota Service Civique : les 1000 missions les plus récentes diffusées à leboncoin.
// SPV et JeVeuxAider ne sont pas plafonnés (bornés par mission_diffusion).
const SERVICE_CIVIQUE_MAX_OFFERS = 1000;
const RECENT_FIRST = { createdAt: Prisma.SortOrder.desc };

// Service Civique est cappé : on ne récupère que des missions réellement localisables (à distance,
// ou avec une adresse complète), pour que les 1000 missions prises donnent bien 1000 offres.
const SC_LOCATABLE: Prisma.MissionWhereInput = {
  OR: [{ remote: "full" }, { addresses: { some: { postalCode: { not: null }, city: { not: null } } } }],
};

type CursorOptions = Parameters<typeof getMissionsCursor>[1];

export interface LeboncoinJobPayload {}

interface FeedResult {
  sent: number;
  url: string;
  ok: boolean;
}

export interface LeboncoinJobResult extends JobResult {
  serviceCivique?: FeedResult;
  spv?: FeedResult;
  jva?: FeedResult;
}

// Chaque flux ne diffuse que les missions présentes dans `mission_diffusion` pour LEBONCOIN :
// c'est le paramètre `diffuseurPublisherId` de `buildWhere` qui applique ce filtre
// (`missionDiffusions.some.distributionPublisherId = LEBONCOIN`, cf. services/mission.ts).
export class LeboncoinHandler implements BaseHandler<LeboncoinJobPayload, LeboncoinJobResult> {
  name = "Génération des feeds Leboncoin";

  public async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();

    // Un flux en échec n'empêche pas les autres : chaque feed est isolé (import SUCCESS/FAILED dédié).
    const serviceCivique = await this.runFeed("LEBONCOIN_SERVICE_CIVIQUE", "leboncoin-service-civique", start, () =>
      this.collectOffers(
        { diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: [PUBLISHER_IDS.SERVICE_CIVIQUE], statusCode: "ACCEPTED", directFilters: SC_LOCATABLE },
        "service-civique",
        { limit: SERVICE_CIVIQUE_MAX_OFFERS, orderBy: RECENT_FIRST }
      )
    );
    const spv = await this.runFeed("LEBONCOIN_SPV", "leboncoin-spv", start, () => this.collectSpvOffers());
    const jva = await this.runFeed("LEBONCOIN_JEVEUXAIDER", "leboncoin-jeveuxaider", start, () =>
      this.collectOffers({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: [PUBLISHER_IDS.JEVEUXAIDER], statusCode: "ACCEPTED" }, "jva", { orderBy: RECENT_FIRST })
    );

    return {
      success: serviceCivique.ok && spv.ok && jva.ok,
      timestamp: new Date(),
      serviceCivique,
      spv,
      jva,
      message: `\t• Service Civique : ${serviceCivique.sent} offres\n\t• Sapeurs-Pompiers : ${spv.sent} offres\n\t• JeVeuxAider : ${jva.sent} offres`,
    };
  }

  /** Parcourt les missions par lots (curseur) et les transforme en offres, en ignorant les non-localisables. */
  private async collectOffers(filters: Omit<MissionSearchFilters, "limit" | "skip">, dispositif: Dispositif, options?: CursorOptions): Promise<LeboncoinOffer[]> {
    const offers: LeboncoinOffer[] = [];
    for await (const mission of getMissionsCursor(filters, options)) {
      const offer = missionToOffer(mission, dispositif);
      if (offer) {
        offers.push(offer);
      }
    }
    return offers;
  }

  /** SPV (rubrique Bénévolat) : périmètre = publishers `volontariat_sapeurs_pompiers` diffusés à leboncoin. */
  private async collectSpvOffers(): Promise<LeboncoinOffer[]> {
    const spvPublishers = await publisherService.findPublishers({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
    const spvPublisherIds = spvPublishers.map((publisher) => publisher.id);
    if (!spvPublisherIds.length) {
      return [];
    }
    return this.collectOffers({ diffuseurPublisherId: PUBLISHER_IDS.LEBONCOIN, publisherIds: spvPublisherIds, statusCode: "ACCEPTED" }, "spv", { orderBy: RECENT_FIRST });
  }

  /** Construit un flux, le stocke et trace l'import. Isole les erreurs : les autres flux continuent. */
  private async runFeed(importName: string, slug: string, start: Date, build: () => Promise<LeboncoinOffer[]>): Promise<FeedResult> {
    try {
      const offers = await build();
      const url = await this.storeFeed(offers, slug);
      await this.recordImport(importName, "SUCCESS", offers.length, start);
      console.log(`[Leboncoin] ${slug}: ${offers.length} offres`);
      return { sent: offers.length, url, ok: true };
    } catch (error) {
      captureException(error);
      console.error("[Leboncoin] %s en échec", slug, error);
      await this.recordImport(importName, "FAILED", 0, start);
      return { sent: 0, url: "", ok: false };
    }
  }

  /** Génère le XML puis l'écrit en local (dev) ou le publie sur S3. */
  private async storeFeed(offers: LeboncoinOffer[], slug: string): Promise<string> {
    const xml = generateXML(offers);
    if (ENV === "development") {
      fs.writeFileSync(`${slug}.xml`, xml);
      return `file://${slug}.xml`;
    }
    return storeXML(xml, slug);
  }

  private async recordImport(name: string, status: "SUCCESS" | "FAILED", createdCount: number, start: Date): Promise<void> {
    if (ENV === "development") {
      return;
    }
    await importService.createImport({ name, publisherId: PUBLISHER_IDS.LEBONCOIN, createdCount, startedAt: start, finishedAt: new Date(), status, failed: { data: [] } });
  }
}
