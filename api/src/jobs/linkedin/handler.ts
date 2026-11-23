import { createWriteStream } from "fs";
import { mkdtemp, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";

import { ENV, PUBLISHER_IDS } from "@/config";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { DISPOSITIFS } from "@/jobs/linkedin/dispositifs";
import { DispositifDefinition } from "@/jobs/linkedin/types";
import { createXMLStream, generateXMLHeader, getMissionsCursor, storeXML, writeJobs, XML_FOOTER } from "@/jobs/linkedin/utils";
import { JobResult } from "@/jobs/types";
import { importService } from "@/services/import";
import { publisherService } from "@/services/publisher";

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

async function resolvePublisherIds(dispositif: DispositifDefinition): Promise<string[]> {
  if ("publisherIds" in dispositif.scope) {
    return dispositif.scope.publisherIds;
  }
  const publishers = await publisherService.findPublishers({ missionType: dispositif.scope.missionType });
  return publishers.map((publisher) => publisher.id);
}

export class LinkedinHandler implements BaseHandler<LinkedinJobPayload, LinkedinJobResult> {
  name = "Génération du feed Linkedin";

  public async handle(payload: LinkedinJobPayload): Promise<LinkedinJobResult> {
    const start = new Date();
    let temporaryDirectory: string | undefined;
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

      temporaryDirectory = await mkdtemp(join(tmpdir(), "linkedin-"));
      const jobsPath = join(temporaryDirectory, "jobs.xml");
      await writeFile(jobsPath, "", { mode: 0o600 });
      for (const dispositif of DISPOSITIFS) {
        const publisherIds = await resolvePublisherIds(dispositif);
        if (!publisherIds.length) {
          continue;
        }
        // Toutes les missions passent par le snapshot `mission_diffusion` de LinkedIn (règles d'exclusion incluses).
        const cursor = getMissionsCursor({ publisherIds, diffuseurPublisherId: PUBLISHER_IDS.LINKEDIN });
        const counters = await writeJobs(cursor, dispositif, jobsPath);
        console.log(`[LinkedinHandler] ${dispositif.label}: ${counters.processed} missions processed, ${counters.sent} jobs added to the feed`);
        result.counter.processed += counters.processed;
        result.counter.sent += counters.sent;
        result.counter.skipped += counters.skipped;
        result.counter.expired += counters.expired;
      }

      const header = generateXMLHeader(result.counter.sent);
      const size = (await stat(jobsPath)).size + Buffer.byteLength(header) + Buffer.byteLength(XML_FOOTER);
      console.log(`[LinkedinHandler] ${size} bytes for ${result.counter.sent} jobs`);

      if (ENV === "development") {
        await pipeline(createXMLStream(jobsPath, header), createWriteStream("linkedin.xml"));
        console.log(`[LinkedinHandler] XML stored in local file`);

        return {
          success: true,
          timestamp: new Date(),
          url: "file://linkedin.xml",
          counter: result.counter,
        };
      }

      const url = await storeXML(jobsPath, header);
      console.log(`[LinkedinHandler] XML stored at ${url}`);

      await importService.createImport({
        name: `LINKEDIN`,
        publisherId: PUBLISHER_IDS.LINKEDIN,
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
        message: `\t• Nombre de missions traitées: ${result.counter.processed}\n\t• Nombre de missions envoyées dans le feed: ${result.counter.sent}\n\t• Nombre de missions expirées: ${result.counter.expired}\n\t• Nombre de missions ignorées: ${result.counter.skipped}`,
      };
    } catch (error) {
      captureException(error);

      await importService.createImport({
        name: `LINKEDIN`,
        publisherId: PUBLISHER_IDS.LINKEDIN,
        startedAt: start,
        finishedAt: new Date(),
        status: "FAILED",
        failed: { data: [] },
      });

      return {
        success: false,
        timestamp: new Date(),
        url: "",
        counter: { processed: 0, sent: 0, expired: 0, skipped: 0 },
      };
    } finally {
      if (temporaryDirectory) {
        await rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
  }
}
