import { XMLParser } from "fast-xml-parser";

import { MissionXML } from "../../../types";

export const parseXML = (xmlString: string) => {
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
    return;
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
};
