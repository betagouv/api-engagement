import { PUBLISHER_IDS } from "../../config";
import { MissionRecord } from "../../types/mission";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { MISSION_FIELDS } from "./constants";

export const buildData = (data: MissionRecord, publisherId: string, moderator: boolean = false) => {
  const obj: any = {};

  // Use MISSION_FIELDS const
  for (const field of MISSION_FIELDS) {
    obj[field] = (data as any)[field];
  }

  obj.applicationUrl = getMissionTrackedApplicationUrl(data as any, publisherId);

  // Add fields to legacy support
  const address = data.addresses?.[0];
  obj.id = data._id;
  obj.address = address ? address.street : undefined;
  obj.city = address ? address.city : undefined;
  obj.postalCode = address ? address.postalCode : undefined;
  obj.departmentCode = address ? address.departmentCode : undefined;
  obj.departmentName = address ? address.departmentName : undefined;
  obj.country = address ? address.country : undefined;
  obj.location = address ? address.location : undefined;

  // Custom hack for remote LBC
  if (publisherId.toString() === PUBLISHER_IDS.LEBONCOIN && obj.remote === "full") {
    obj.title = `[À distance] ${obj.title}`;
    obj.postalCode = "75000";
    obj.departmentCode = "75";
    obj.departmentName = "Paris";
    obj.city = "Paris";
    obj.country = "FR";
    obj.location = {
      lat: 48.854744,
      lon: 2.348715,
    };
  }
  return obj;
};
