import { XMLBuilder } from "fast-xml-parser";

import { Prisma } from "@/db/core";
import { buildWhere, missionService } from "@/services/mission";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord, MissionSearchFilters } from "@/types/mission";
import { GRIMPIO_XML_URL } from "@/jobs/grimpio/config";
import { missionToGrimpioJob } from "@/jobs/grimpio/transformers";
import { GrimpioJob } from "@/jobs/grimpio/types";

const DEFAULT_BATCH_SIZE = 500;

export async function* getMissionsCursor(filters: Omit<MissionSearchFilters, "limit" | "skip">, batchSize: number = DEFAULT_BATCH_SIZE) {
  const countFilters: MissionSearchFilters = { ...filters, limit: batchSize, skip: 0 };
  const total = await missionService.countMissions(countFilters);
  const where = buildWhere(countFilters);

  let skip = 0;
  while (skip < total) {
    const missions = await missionService.findMissionsBy(where, {
      limit: batchSize,
      skip,
      orderBy: { createdAt: Prisma.SortOrder.asc },
    });

    if (!missions.length) {
      break;
    }

    for (const mission of missions) {
      yield mission;
    }

    skip += missions.length;
  }
}

export async function generateJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: GrimpioJob[]; expired: number; processed: number }> {
  const jobs = [] as GrimpioJob[];
  let expired = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    const data = missionToGrimpioJob(mission);
    // Check if mission has expired (using endAt if available)
    if (mission.endAt && new Date(mission.endAt).getTime() < Date.now()) {
      expired++;
      continue;
    }
    jobs.push(data);
  }

  return { jobs, expired, processed };
}

const CDATA_KEYS = ["title", "url", "contractType", "enterpriseName", "description", "enterpriseIndustry", "externalId", "logo", "remoteJob", "duration", "startingDate"];

export function generateXML(data: GrimpioJob[]) {
  // Recursive function to wrap with cdata every listed key at any level
  const wrapWithCdata = (obj: any, parentKey?: string): any => {
    if (Array.isArray(obj)) {
      if (parentKey && CDATA_KEYS.includes(parentKey)) {
        return obj.map((el) => (typeof el === "string" ? { "#cdata": el } : wrapWithCdata(el)));
      } else {
        return obj.map((el) => wrapWithCdata(el));
      }
    }
    if (obj && typeof obj === "object") {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (CDATA_KEYS.includes(key) && typeof value === "string") {
          result[key] = { "#cdata": value };
        } else if (Array.isArray(value) || (value && typeof value === "object")) {
          result[key] = wrapWithCdata(value, key);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    return obj;
  };

  const obj = {
    source: {
      publisher: "api-engagement",
      publisherurl: "https://api-engagement.beta.gouv.fr/",
      lastbuilddate: new Date().toUTCString(),
      job: data.map((job) => wrapWithCdata(job)),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    cdataPropName: "#cdata",
  });

  return builder.build(obj);
}

export async function storeXML(xml: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  await putObject(`xml/grimpio-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/grimpio.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${GRIMPIO_XML_URL}-${date}.xml`;
}
