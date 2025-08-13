import { XMLBuilder } from "fast-xml-parser";

import { JVA_LOGO_URL } from "../../config";
import MissionModel from "../../models/mission";
import { OBJECT_ACL, putObject } from "../../services/s3";
import { Mission } from "../../types";
import { CATEGORY_MAPPING, TALENT_XML_URL } from "./config";
import { missionToTalentJob } from "./transformers";
import { TalentJob } from "./types";

export function getMissionsCursor(where: { [key: string]: any }) {
  return MissionModel.find(where).sort({ createdAt: "asc" }).lean().cursor();
}

export async function generateJobs(missionsCursor: AsyncIterable<Mission>): Promise<{ jobs: TalentJob[]; expired: number; processed: number }> {
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
  console.log("getImageUrl", image);
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
