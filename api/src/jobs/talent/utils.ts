import { XMLBuilder } from "fast-xml-parser";

import { JVA_LOGO_URL } from "@/config";
import { Prisma } from "@/db/core";
import { buildWhere, missionService } from "@/services/mission";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord, MissionSearchFilters } from "@/types/mission";
import { CATEGORY_MAPPING, TALENT_XML_URL } from "@/jobs/talent/config";
import { missionToTalentJob } from "@/jobs/talent/transformers";
import { TalentJob } from "@/jobs/talent/types";

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

export async function generateJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: TalentJob[]; expired: number; processed: number }> {
  const jobs = [] as TalentJob[];
  let expired = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    const data = missionToTalentJob(mission);
    for (const job of data) {
      if (job.expirationdate && new Date(job.expirationdate).getTime() < Date.now()) {
        expired++;
        continue;
      }
      jobs.push(job);
    }
  }

  return { jobs, expired, processed };
}

export function getImageUrl(image?: string) {
  if (image && image.endsWith(".png")) {
    return image;
  }
  return JVA_LOGO_URL;
}

const CDATA_KEYS = [
  "referencenumber",
  "title",
  "description",
  "company",
  "city",
  "state",
  "country",
  "dateposted",
  "url",
  "expirationdate",
  "streetaddress",
  "postalcode",
  "jobtype",
  "isremote",
  "benefit",
  "category",
  "logo",
  "experience",
  "cpc",
  "salary",
];

export function generateXML(data: TalentJob[]) {
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

  await putObject(`xml/talent-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/talent.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${TALENT_XML_URL}-${date}.xml`;
}

export function getActivityCategory(activity: string): string | undefined {
  return CATEGORY_MAPPING[activity as keyof typeof CATEGORY_MAPPING];
}
