import fs from "fs";

import { ENV, JVA_ID } from "../../config";
import ImportModel from "../../models/import";
import PublisherModel from "../../models/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { LINKEDIN_ID, PARTNERS_IDS } from "./config";
import { generateJvaJobs, generatePartnersJobs, generateXML, getMissions, storeXML } from "./utils";

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
  public async handle(payload: LinkedinJobPayload): Promise<LinkedinJobResult> {
    const start = new Date();
    try {
      const linkedin = await PublisherModel.findById(LINKEDIN_ID);
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

      const jobs = [];

      console.log(`[LinkedinHandler] Querying missions of JeVeuxAider.gouv.fr`);
      const JvaMissions = await getMissions({
        deletedAt: null,
        statusCode: "ACCEPTED",
        publisherId: JVA_ID,
      });
      console.log(`[LinkedinHandler] ${JvaMissions.length} missions found`);

      const jvaJobs = generateJvaJobs(JvaMissions);
      console.log(`[LinkedinHandler] ${jvaJobs.jobs.length} jobs added to the feed`);
      jobs.push(...jvaJobs.jobs);
      result.counter.processed += JvaMissions.length;
      result.counter.sent += jvaJobs.jobs.length;
      result.counter.skipped += jvaJobs.skipped;
      result.counter.expired += jvaJobs.expired;

      console.log(`[LinkedinHandler] Querying missions of partners`);
      const partnersMissions = await getMissions({
        deletedAt: null,
        statusCode: "ACCEPTED",
        publisherId: { $in: PARTNERS_IDS },
      });
      console.log(`[LinkedinHandler] ${partnersMissions.length} partners missions found`);
      const partnersJobs = generatePartnersJobs(partnersMissions);
      console.log(`[LinkedinHandler] ${partnersJobs.jobs.length} jobs added to the feed`);
      jobs.push(...partnersJobs.jobs);
      result.counter.processed += partnersMissions.length;
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
        publisherId: LINKEDIN_ID,
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
      };
    } catch (error) {
      console.error(`[LinkedinHandler] Error processing missions`, error);

      await ImportModel.create({
        name: `LINKEDIN`,
        publisherId: LINKEDIN_ID,
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
