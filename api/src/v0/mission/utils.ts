import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import { captureMessage } from "../../error";
import MissionModel from "../../models/mission";
import { Stats } from "../../types";
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

export const findMissionTemp = async (missionId: string) => {
  if (!missionId.match(/[^0-9a-fA-F]/) && missionId.length === 24) {
    const mission = await MissionModel.findById(missionId);
    if (mission) {
      return mission;
    }
  }

  const mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
  if (mission) {
    captureMessage("[Temp] Mission found with _old_ids", `mission ${missionId}`);
    return mission;
  }

  const response2 = await esClient.search({
    index: STATS_INDEX,
    body: { query: { term: { "missionId.keyword": missionId } }, size: 1 },
  });
  if (response2.body.hits.total.value > 0) {
    const stats = {
      _id: response2.body.hits.hits[0]._id,
      ...response2.body.hits.hits[0]._source,
    } as Stats;
    const mission = await MissionModel.findOne({
      clientId: stats.missionClientId?.toString(),
      publisherId: stats.toPublisherId,
    });
    if (mission) {
      captureMessage("[Temp] Mission found with click", `mission ${missionId}`);
      return mission;
    }
  }
  return null;
};
