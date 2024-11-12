import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import KpiModel from "../../models/kpi";
import MissionModel from "../../models/mission";
import { Kpi } from "../../types";

// Cron that create a kpi doc every with the data available
const handler = async () => {
  const now = new Date();
  // Get the previous day
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const kpi = {
    date,
  } as Kpi;

  const whereMissionAvailable = {
    $or: [{ deletedAt: { $gte: date } }, { deleted: false }],
    createdAt: { $lt: endDate },
  };

  const availableMissionCount = await MissionModel.countDocuments(whereMissionAvailable);

  const benevolatAvailableMissionCount = await MissionModel.countDocuments({
    ...whereMissionAvailable,
    publisherName: "Service Civique",
  });

  const volontariatAvailableMissionCount = await MissionModel.countDocuments({
    ...whereMissionAvailable,
    publisherName: { $ne: "Service Civique" },
  });

  const placeCountAggs = await MissionModel.aggregate([
    { $match: whereMissionAvailable },
    // sum of the numbers field originalPlaces
    { $group: { _id: null, total: { $sum: "$originalPlaces" } } },
  ]);
  const availablePlaceCount = placeCountAggs.length ? placeCountAggs[0].total : 0;

  const activeMissionCountAggs = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        range: { createdAt: { gte: date, lt: endDate } },
      },
      aggs: {
        activeMissionCount: {
          cardinality: { field: "missionId.keyword" },
        },
      },
    },
  });
  const activeMissionCount = activeMissionCountAggs.body.aggregations.activeMissionCount.value || 0;

  kpi.benevolatAvailableMissionCount = benevolatAvailableMissionCount;
  kpi.volontariatAvailableMissionCount = volontariatAvailableMissionCount;
  kpi.availablePlaceCount = availablePlaceCount;
  kpi.availableMissionCount = availableMissionCount;
  kpi.activeMissionCount = activeMissionCount;

  await KpiModel.create(kpi);

  console.log(`[KPI] Created kpi for ${now.toISOString()}`);
};

export default { handler };
