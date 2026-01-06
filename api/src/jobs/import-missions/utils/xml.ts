import { XMLParser } from "fast-xml-parser";

import { captureException } from "../../../error";
import type { PublisherRecord } from "../../../types/publisher";
import { MissionXML } from "../types";

export const fetchXML = async (publisher: PublisherRecord): Promise<{ ok: boolean; data: string; error?: string; status?: number }> => {
  try {
    if (!publisher.feed) {
      return { ok: false, data: "", error: "No feed", status: 400 };
    }
    const headers = new Headers();

    if (publisher.feedUsername && publisher.feedPassword) {
      headers.set("Authorization", `Basic ${btoa(`${publisher.feedUsername}:${publisher.feedPassword}`)}`);
    }
    console.log(`[${publisher.name}] Fetching xml from ${publisher.feed}`);
    const response = await fetch(publisher.feed.trim(), { headers });

    if (!response.ok) {
      return { ok: false, data: "", error: response.statusText, status: response.status };
    }
    return { ok: true, data: await response.text() };
  } catch (error: any) {
    captureException(error, { extra: { publisher } });
    return { ok: false, data: "", error: error.message, status: 500 };
  }
};

const isXml = (xmlString: string): boolean => {
  return xmlString.includes("<?xml");
};

export const parseXML = (xmlString: string): MissionXML[] | string => {
  try {
    if (!isXml(xmlString)) {
      return "Not an XML";
    }
    const parser = new XMLParser();

    const options = {
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      ignoreAttributes: true,
      ignoreNameSpace: false,
      allowBooleanAttributes: false,
      parseNodeValue: true,
      parseAttributeValue: false,
      trimValues: true,
      cdataPositionChar: "\\c",
      parseTrueNumberOnly: false,
      arrayMode: false, //"strict"
      stopNodes: ["parse-me-as-string"],
      isArray: (name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean) => {
        if (jpath === "source.mission.addresses.address") {
          return true;
        }
        return false;
      },
    };

    const res = parser.parse(xmlString, options);

    if (!res.source || !res.source.mission) {
      return "Empty xml";
    }
    if (res.source.mission && !Array.isArray(res.source.mission)) {
      res.source.mission = [res.source.mission];
    }

    // Remove duplicates clientId
    const clientId = new Set();
    const unique = [] as MissionXML[];
    const data = res.source.mission as MissionXML[];

    data.forEach((mission) => {
      if (!clientId.has(mission.clientId)) {
        const addresses = mission.addresses as any;
        if (addresses?.address && Array.isArray(addresses.address)) {
          mission.addresses = addresses.address;
        } else if (addresses?.address) {
          mission.addresses = [addresses.address];
        }
        clientId.add(mission.clientId);
        unique.push(mission);
      }
    });

    return unique;
  } catch (error) {
    captureException(error, { extra: { xml: xmlString?.slice(0, 1000) } });
    return "Error parsing xml";
  }
};
