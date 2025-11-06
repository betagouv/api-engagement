import fs from "fs";

import { ENV, PUBLISHER_IDS } from "../../config";
import { captureException } from "../../error";
import ImportModel from "../../models/import";
import { publisherService } from "../../services/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { PARTNERS_IDS } from "./config";
import { LinkedInJob } from "./types";
import { generateJvaJobs, generatePartnersJobs, generateXML, getMissionsCursor, storeXML } from "./utils";

export interface LinkedinJobPayload {}

export interface LinkedinJobResult extends JobResult {
  url?: string;
  counter: {
    processed: number;
    sent: number;
    expired: number;
    skipped: number;
  };
}

export class LinkedinHandler implements BaseHandler<LinkedinJobPayload, LinkedinJobResult> {
  name = "Génération du feed Linkedin";

  public async handle(payload: LinkedinJobPayload): Promise<LinkedinJobResult> {
    const start = new Date();
    try {
      const linkedin = await publisherService.findOnePublisherById(PUBLISHER_IDS.LINKEDIN);
      if (!linkedin) {
        throw new Error("Linkedin publisher not found");
      }

      const result = {
        url: "",
        counter: {
          processed: 0,
          sent: 0,
          expired: 0,
          skipped: 0,
        },
      } as LinkedinJobResult;

      const jobs: LinkedInJob[] = [];

      console.log(`[LinkedinHandler] Querying and processing missions of JeVeuxAider.gouv.fr`);
      const JvaMissionsCursor = getMissionsCursor({
        deletedAt: null,
        statusCode: "ACCEPTED",
        publisherId: PUBLISHER_IDS.JEVEUXAIDER,
      });

      const jvaJobs = await generateJvaJobs(JvaMissionsCursor);
      console.log(`[LinkedinHandler] ${jvaJobs.processed} JVA missions processed, ${jvaJobs.jobs.length} jobs added to the feed`);
      jobs.push(...jvaJobs.jobs);
      result.counter.processed += jvaJobs.processed;
      result.counter.sent += jvaJobs.jobs.length;
      result.counter.skipped += jvaJobs.skipped;
      result.counter.expired += jvaJobs.expired;

      console.log(`[LinkedinHandler] Querying and processing missions of partners`);
      const partnersMissionsCursor = getMissionsCursor({
        deletedAt: null,
        statusCode: "ACCEPTED",
        publisherId: { $in: PARTNERS_IDS },
      });

      const partnersJobs = await generatePartnersJobs(partnersMissionsCursor);
      console.log(`[LinkedinHandler] ${partnersJobs.processed} partners missions processed, ${partnersJobs.jobs.length} jobs added to the feed`);
      jobs.push(...partnersJobs.jobs);
      result.counter.processed += partnersJobs.processed;
      result.counter.sent += partnersJobs.jobs.length;
      result.counter.skipped += partnersJobs.skipped;

      console.log(`[LinkedinHandler] Generating XML for ${jobs.length} jobs`);
      const xml = generateXML(jobs);
      console.log(`[LinkedinHandler] ${xml.length} bytes`);

      if (ENV === "development") {
        fs.writeFileSync("linkedin.xml", xml);
        console.log(`[LinkedinHandler] XML stored in local file`);

        return {
          success: true,
          timestamp: new Date(),
          url: "file://linkedin.xml",
          counter: result.counter,
        };
      }

      const url = await storeXML(xml);
      console.log(`[LinkedinHandler] XML stored at ${url}`);

      await ImportModel.create({
        name: `LINKEDIN`,
        publisherId: PUBLISHER_IDS.LINKEDIN,
        createdCount: result.counter.sent,
        updatedCount: 0,
        deletedCount: 0,
        missionCount: 0,
        refusedCount: 0,
        startedAt: start,
        endedAt: new Date(),
        status: "SUCCESS",
        failed: { data: [] },
      });

      return {
        success: true,
        timestamp: new Date(),
        url,
        counter: result.counter,
        message: `\t• Nombre de missions traitées: ${result.counter.processed}\n\t• Nombre de missions envoyées dans le feed: ${result.counter.sent}\n\t• Nombre de missions expirées: ${result.counter.expired}\n\t• Nombre de missions ignorées: ${result.counter.skipped}`,
      };
    } catch (error) {
      captureException(error);

      await ImportModel.create({
        name: `LINKEDIN`,
        publisherId: PUBLISHER_IDS.LINKEDIN,
        startedAt: start,
        endedAt: new Date(),
        status: "FAILED",
        failed: { data: [] },
      });

      return {
        success: false,
        timestamp: new Date(),
        url: "",
        counter: { processed: 0, sent: 0, expired: 0, skipped: 0 },
      };
    }
  }
}
