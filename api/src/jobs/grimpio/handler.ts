import fs from "fs";

import { ENV, PUBLISHER_IDS } from "../../config";
import { captureException } from "../../error";
import { importService } from "../../services/import";
import { publisherService } from "../../services/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { GRIMPIO_PUBLISHER_ID } from "./config";
import { generateJobs, generateXML, getMissionsCursor, storeXML } from "./utils";

export interface GrimpioJobPayload {}

export interface GrimpioJobResult extends JobResult {
  url?: string;
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

      const result = {
        url: "",
        counter: {
          processed: 0,
          sent: 0,
          expired: 0,
        },
      } as GrimpioJobResult;

      const jobs = [];

      console.log(`[Grimpio Job] Querying and processing missions of JeVeuxAider.gouv.fr`);
      const JvaMissionsCursor = getMissionsCursor({
        deletedAt: null,
        statusCode: "ACCEPTED",
        publisherId: PUBLISHER_IDS.JEVEUXAIDER,
      });

      const jvaJobs = await generateJobs(JvaMissionsCursor);
      console.log(`[Grimpio Job] ${jvaJobs.processed} JeVeuxAider missions processed, ${jvaJobs.jobs.length} jobs added to the feed`);
      jobs.push(...jvaJobs.jobs);
      result.counter.processed += jvaJobs.processed;
      result.counter.sent += jvaJobs.jobs.length;
      result.counter.expired += jvaJobs.expired;

      // TODO: Uncomment when Service Civique is available
      // console.log(`[Grimpio Job] Querying and processing missions of Service Civique`);
      // const scMissionsCursor = getMissionsCursor({
      //   deletedAt: null,
      //   statusCode: "ACCEPTED",
      //   publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE,
      // });

      // const scJobs = await generateJobs(scMissionsCursor);
      // console.log(`[Grimpio Job] ${scJobs.processed} Service Civique missions processed, ${scJobs.jobs.length} jobs added to the feed`);
      // jobs.push(...scJobs.jobs);
      // result.counter.processed += scJobs.processed;
      // result.counter.sent += scJobs.jobs.length;
      // result.counter.expired += scJobs.expired;

      console.log(`[Grimpio Job] Generating XML for ${jobs.length} jobs`);
      const xml = generateXML(jobs);
      console.log(`[Grimpio Job] ${xml.length} bytes`);

      if (ENV === "development") {
        fs.writeFileSync("grimpio.xml", xml);
        console.log(`[Grimpio Job] XML stored in local file`);

        return {
          success: true,
          timestamp: new Date(),
          url: "file://grimpio.xml",
          counter: result.counter,
        };
      }

      const url = await storeXML(xml);
      console.log(`[Grimpio Job] XML stored at ${url}`);

      await importService.createImport({
        name: `GRIMPIO`,
        publisherId: PUBLISHER_IDS.GRIMPIO,
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
        url: "",
        counter: { processed: 0, sent: 0, expired: 0 },
      };
    }
  }
}
