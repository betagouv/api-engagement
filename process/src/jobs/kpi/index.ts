import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import KpiModel from "../../models/kpi";
import MissionModel from "../../models/mission";
import { Kpi } from "../../types";

// Cron that create a kpi doc every with the data available
const handler = async (start?: Date) => {
  if (!start) start = new Date();
  console.log(`[KPI] Starting at ${start.toISOString()}`);

  // Get the previous day
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const kpi = {
    date,
  } as Kpi;

  const whereMissionAvailable = {
    $or: [{ deletedAt: { $gte: date } }, { deleted: false }],
    createdAt: { $lt: endDate },
  };

  const whereBenevolatAvailable = { ...whereMissionAvailable, publisherName: "Service Civique" };
  const whereVolontariatAvailable = { ...whereMissionAvailable, publisherName: { $ne: "Service Civique" } };

  const benevolatAvailableMissionCount = await MissionModel.countDocuments(whereBenevolatAvailable);
  const volontariatAvailableMissionCount = await MissionModel.countDocuments(whereVolontariatAvailable);

  const aggs = await MissionModel.aggregate([
    { $match: whereMissionAvailable },
    {
      $facet: {
        benevolat_given: [{ $match: { ...whereBenevolatAvailable, placesStatus: "GIVEN_BY_PARTNER" } }, { $group: { _id: null, total: { $sum: "$places" } } }],
        volontariat_given: [{ $match: { ...whereVolontariatAvailable, placesStatus: "GIVEN_BY_PARTNER" } }, { $group: { _id: null, total: { $sum: "$places" } } }],
        benevolat_attributed: [{ $match: { ...whereBenevolatAvailable, placesStatus: "ATTRIBUTED_BY_API" } }, { $group: { _id: null, total: { $sum: "$places" } } }],
        volontariat_attributed: [{ $match: { ...whereVolontariatAvailable, placesStatus: "ATTRIBUTED_BY_API" } }, { $group: { _id: null, total: { $sum: "$places" } } }],
      },
    },
  ]);

  const availableBenevolatPlaceGivenCount = aggs.length ? aggs[0].benevolat_given.total : 0;
  const availableVolontariatPlaceGivenCount = aggs.length ? aggs[0].volontariat_given.total : 0;
  const availableBenevolatPlaceAttributedCount = aggs.length ? aggs[0].benevolat_attributed.total : 0;
  const availableVolontariatPlaceAttributedCount = aggs.length ? aggs[0].volontariat_attributed.total : 0;

  const percentageBenevolatPlacesGiven = availableBenevolatPlaceGivenCount / benevolatAvailableMissionCount;
  const percentageVolontariatPlacesGiven = availableVolontariatPlaceGivenCount / volontariatAvailableMissionCount;
  const percentageBenevolatPlacesAttributed = availableBenevolatPlaceAttributedCount / benevolatAvailableMissionCount;
  const percentageVolontariatPlacesAttributed = availableVolontariatPlaceAttributedCount / volontariatAvailableMissionCount;

  const statsBenevolatAggs = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must_not: {
            term: { "publisherName.keyword": "Service Civique" },
          },
          filter: [{ range: { createdAt: { gte: date, lt: endDate } } }],
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        account: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
      },
    },
  });
  const statsVolontariatAggs = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          filter: [{ term: { "publisherName.keyword": "Service Civique" } }, { range: { createdAt: { gte: date, lt: endDate } } }],
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
        account: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            cardinality: { field: "missionId.keyword" },
          },
        },
      },
    },
  });
  const printBenevolat = statsBenevolatAggs.body.aggregations.print.cardinality.value || 0;
  const clickBenevolat = statsBenevolatAggs.body.aggregations.click.cardinality.value || 0;
  const applyBenevolat = statsBenevolatAggs.body.aggregations.apply.cardinality.value || 0;
  const accountBenevolat = statsBenevolatAggs.body.aggregations.account.cardinality.value || 0;

  const printVolontariat = statsVolontariatAggs.body.aggregations.print.cardinality.value || 0;
  const clickVolontariat = statsVolontariatAggs.body.aggregations.click.cardinality.value || 0;
  const applyVolontariat = statsVolontariatAggs.body.aggregations.apply.cardinality.value || 0;
  const accountVolontariat = statsVolontariatAggs.body.aggregations.account.cardinality.value || 0;

  kpi.benevolatAvailableMissionCount = benevolatAvailableMissionCount;
  kpi.volontariatAvailableMissionCount = volontariatAvailableMissionCount;

  kpi.availableBenevolatPlaceGivenCount = availableBenevolatPlaceGivenCount;
  kpi.availableVolontariatPlaceGivenCount = availableVolontariatPlaceGivenCount;
  kpi.availableBenevolatPlaceAttributedCount = availableBenevolatPlaceAttributedCount;
  kpi.availableVolontariatPlaceAttributedCount = availableVolontariatPlaceAttributedCount;

  kpi.percentageBenevolatPlacesGiven = percentageBenevolatPlacesGiven;
  kpi.percentageVolontariatPlacesGiven = percentageVolontariatPlacesGiven;
  kpi.percentageBenevolatPlacesAttributed = percentageBenevolatPlacesAttributed;
  kpi.percentageVolontariatPlacesAttributed = percentageVolontariatPlacesAttributed;

  kpi.benevolatPrintMissionCount = printBenevolat;
  kpi.volontariatPrintMissionCount = printVolontariat;

  kpi.benevolatClickMissionCount = clickBenevolat;
  kpi.volontariatClickMissionCount = clickVolontariat;

  kpi.benevolatApplyMissionCount = applyBenevolat;
  kpi.volontariatApplyMissionCount = applyVolontariat;

  kpi.benevolatAccountMissionCount = accountBenevolat;
  kpi.volontariatAccountMissionCount = accountVolontariat;

  await KpiModel.create(kpi);

  console.log(`[KPI] Created kpi for ${start.toISOString()}`);
};

export default { handler };
