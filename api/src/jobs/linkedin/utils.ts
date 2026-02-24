import { XMLBuilder } from "fast-xml-parser";

import { Prisma } from "@/db/core";
import { buildWhere, missionService } from "@/services/mission";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord, MissionSearchFilters } from "@/types/mission";
import { AUDIENCE_MAPPING, DOMAIN_MAPPING, LINKEDIN_XML_URL } from "@/jobs/linkedin/config";
import { missionToLinkedinJob } from "@/jobs/linkedin/transformers";
import { LinkedInJob } from "@/jobs/linkedin/types";

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

export async function generateJvaJobs(
  missionsCursor: AsyncIterable<MissionRecord>
): Promise<{ jobs: LinkedInJob[]; expired: number; skipped: number; processed: number }> {
  const jobs = [] as LinkedInJob[];
  let expired = 0;
  let skipped = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    const job = missionToLinkedinJob(mission, "jeveuxaider.gouv.fr");
    if (!job) {
      skipped++;
      continue;
    }
    if (job.expirationDate && new Date(job.expirationDate).getTime() < Date.now()) {
      expired++;
      continue;
    }
    jobs.push(job);
  }

  return { jobs, expired, skipped, processed };
}

export async function generatePartnersJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: LinkedInJob[]; skipped: number; processed: number }> {
  const jobs = [] as LinkedInJob[];
  let skipped = 0;
  let processed = 0;

  let slot = 0;
  for await (const mission of missionsCursor) {
    processed++;
    const job = missionToLinkedinJob(mission, "benevolt");
    if (!job) {
      skipped++;
      continue;
    }
    if (slot >= 50) {
      break;
    }
    jobs.push(job);
    slot++;
  }

  return { jobs, skipped, processed };
}

const CDATA_KEYS = [
  "partnerJobId",
  "description",
  "title",
  "applyUrl",
  "company",
  "companyId",
  "location",
  "alternateLocation",
  "city",
  "country",
  "postalCode",
  "expirationDate",
  "listDate",
  "industry",
  "industryCode",
  "workplaceTypes",
];

export function generateXML(data: LinkedInJob[]) {
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
      publisherUrl: "https://api-engagement.beta.gouv.fr/",
      lastBuildDate: new Date().toUTCString(),
      expectedJobCount: { "#cdata": data.length },
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

  await putObject(`xml/linkedin-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/linkedin.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${LINKEDIN_XML_URL}-${date}.xml`;
}

export function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING["autre"];
}

export function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING["any_public"];
}
