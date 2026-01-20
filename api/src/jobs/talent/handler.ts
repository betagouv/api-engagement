import fs from "fs";

import { ENV, PUBLISHER_IDS } from "../../config";
import { captureException } from "../../error";
import { importService } from "../../services/import";
import { publisherService } from "../../services/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { TALENT_PUBLISHER_ID } from "./config";
import { generateJobs, generateXML, getMissionsCursor, storeXML } from "./utils";

export interface TalentJobPayload {}

export interface TalentJobResult extends JobResult {
  url?: string;
  counter: {
    processed: number;
    sent: number;
    expired: number;
  };
}

export class TalentHandler implements BaseHandler<TalentJobPayload, TalentJobResult> {
  name = "Génération du feed Talent";

  public async handle(payload: TalentJobPayload): Promise<TalentJobResult> {
    const start = new Date();
    try {
      const talent = await publisherService.findOnePublisherById(TALENT_PUBLISHER_ID);
      if (!talent) {
        throw new Error("Talent publisher not found");
      }

      const result = {
        url: "",
        counter: {
          processed: 0,
          sent: 0,
          expired: 0,
        },
      } as TalentJobResult;

      const jobs = [];

      console.log(`[Talent Job] Querying and processing missions of JeVeuxAider.gouv.fr`);
      const JvaMissionsCursor = getMissionsCursor({
        publisherIds: [PUBLISHER_IDS.JEVEUXAIDER],
      });

      const jvaJobs = await generateJobs(JvaMissionsCursor);
      console.log(`[Talent Job] ${jvaJobs.processed} JeVeuxAider missions processed, ${jvaJobs.jobs.length} jobs added to the feed`);
      jobs.push(...jvaJobs.jobs);
      result.counter.processed += jvaJobs.processed;
      result.counter.sent += jvaJobs.jobs.length;
      result.counter.expired += jvaJobs.expired;

      // Waiting for the service civique to be ready
      // console.log(`[Talent Job] Querying and processing missions of Service Civique`);
      // const scMissionsCursor = getMissionsCursor({
      //   publisherIds: [PUBLISHER_IDS.SERVICE_CIVIQUE],
      // });

      // const scJobs = await generateJobs(scMissionsCursor);
      // console.log(`[Talent Job] ${scJobs.processed} Service Civique missions processed, ${scJobs.jobs.length} jobs added to the feed`);
      // jobs.push(...scJobs.jobs);
      // result.counter.processed += scJobs.processed;
      // result.counter.sent += scJobs.jobs.length;
      // result.counter.expired += scJobs.expired;

      console.log(`[Talent Job] Generating XML for ${jobs.length} jobs`);
      const xml = generateXML(jobs);
      console.log(`[Talent Job] ${xml.length} bytes`);

      if (ENV === "development") {
        fs.writeFileSync("talent.xml", xml);
        console.log(`[Talent Job] XML stored in local file`);

        return {
          success: true,
          timestamp: new Date(),
          url: "file://talent.xml",
          counter: result.counter,
        };
      }

      const url = await storeXML(xml);
      console.log(`[Talent Job] XML stored at ${url}`);

      await importService.createImport({
        name: `TALENT`,
        publisherId: PUBLISHER_IDS.TALENT,
        createdCount: result.counter.sent,
        updatedCount: 0,
        deletedCount: 0,
        missionCount: 0,
        refusedCount: 0,
        startedAt: start,
        finishedAt: new Date(),
        status: "SUCCESS",
        failed: { data: [] },
      });

      return {
        success: true,
        timestamp: new Date(),
        url,
        counter: result.counter,
        message: `\t• Nombre de missions traitées: ${result.counter.processed}\n\t• Nombre de missions envoyées dans le feed: ${result.counter.sent}\n\t• Nombre de missions expirées: ${result.counter.expired}`,
      };
    } catch (error) {
      captureException(error);

      await importService.createImport({
        name: `TALENT`,
        publisherId: PUBLISHER_IDS.TALENT,
        startedAt: start,
        finishedAt: new Date(),
        status: "FAILED",
        failed: { data: [] },
      });

      return {
        success: false,
        timestamp: new Date(),
        url: "",
        counter: { processed: 0, sent: 0, expired: 0 },
      };
    }
  }
}
