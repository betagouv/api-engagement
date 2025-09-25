import { captureMessage } from "../../error";
import MissionModel from "../../models/mission";
import { EARTH_RADIUS } from "../../utils";

export const buildArrayQuery = (query: string | string[]) => {
  if (!Array.isArray(query) && query.includes(",")) {
    query = query.split(",").map((e: string) => e.trim());
  }
  return Array.isArray(query) ? { $in: query } : query;
};

export const buildDateQuery = (query: string) => {
  try {
    const operation = query.slice(0, 3);
    const date = query.slice(3);
    if (!date) {
      return undefined;
    }
    if (isNaN(new Date(date).getTime())) {
      return undefined;
    }
    return { [operation === "gt:" ? "$gt" : "$lt"]: new Date(date) };
  } catch (error) {
    return undefined;
  }
};

// Convert $nearSphere to $geoWithin (doesn't work with countDocuments)
export const nearSphereToGeoWithin = (nearSphere: any) => {
  if (!nearSphere) {
    return;
  }
  const distanceKm = nearSphere.$maxDistance / 1000;
  const geoWithin = {
    $geoWithin: {
      $centerSphere: [[nearSphere.$geometry.coordinates[0], nearSphere.$geometry.coordinates[1]], distanceKm / EARTH_RADIUS],
    },
  };
  return geoWithin;
};

export const findMissionById = async (missionId: string) => {
  const mission = await MissionModel.findById(missionId);
  if (mission) {
    return mission;
  }

  captureMessage("[findMissionById] Mission not found", `mission ${missionId}`);
  return null;
};
