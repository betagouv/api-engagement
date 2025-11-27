import { XMLBuilder } from "fast-xml-parser";

import MissionModel from "../../models/mission";
import { OBJECT_ACL, putObject } from "../../services/s3";
import { Mission } from "../../types";
import { GRIMPIO_XML_URL } from "./config";
import { missionToGrimpioJob } from "./transformers";
import { GrimpioJob } from "./types";

export function getMissionsCursor(where: { [key: string]: any }) {
  return MissionModel.find(where).sort({ createdAt: "asc" }).lean().cursor();
}

export async function generateJobs(missionsCursor: AsyncIterable<Mission>): Promise<{ jobs: GrimpioJob[]; expired: number; processed: number }> {
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
