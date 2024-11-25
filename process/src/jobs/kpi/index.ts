import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import KpiModel from "../../models/kpi";
import MissionModel from "../../models/mission";
import { Kpi } from "../../types";

// Cron that create a kpi doc every with the data available
const buildDayKpi = async (start: Date) => {
  console.log(`[KPI] Starting at ${start.toISOString()}`);

  // Get the previous day
  const fromDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const kpi = {
    date: start,
  } as Kpi;

  const whereMissionAvailable = {
    $or: [{ deletedAt: { $gte: fromDate } }, { deleted: false }],
    createdAt: { $lt: endDate },
  };

  const whereBenevolatAvailable = { ...whereMissionAvailable, publisherName: { $ne: "Service Civique" } };
  const whereVolontariatAvailable = { ...whereMissionAvailable, publisherName: "Service Civique" };

  const availableBenevolatMissionCount = await MissionModel.countDocuments(whereBenevolatAvailable);
  const availableVolontariatMissionCount = await MissionModel.countDocuments(whereVolontariatAvailable);

  const aggs = await MissionModel.aggregate([
    {
      $facet: {
        benevolat_given: [{ $match: { ...whereBenevolatAvailable, placesStatus: "GIVEN_BY_PARTNER" } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$places" } } }],
        volontariat_given: [
          { $match: { ...whereVolontariatAvailable, placesStatus: "GIVEN_BY_PARTNER" } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$places" } } },
        ],
        benevolat_attributed: [
          { $match: { ...whereBenevolatAvailable, placesStatus: "ATTRIBUTED_BY_API" } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$places" } } },
        ],
        volontariat_attributed: [
          { $match: { ...whereVolontariatAvailable, placesStatus: "ATTRIBUTED_BY_API" } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$places" } } },
        ],
      },
    },
  ]);

  const availableBenevolatGivenPlaceCount = aggs.length ? aggs[0].benevolat_given[0]?.total || 0 : 0;
  const availableVolontariatGivenPlaceCount = aggs.length ? aggs[0].volontariat_given[0]?.total || 0 : 0;
  const availableBenevolatAttributedPlaceCount = aggs.length ? aggs[0].benevolat_attributed[0]?.total || 0 : 0;
  const availableVolontariatAttributedPlaceCount = aggs.length ? aggs[0].volontariat_attributed[0]?.total || 0 : 0;

  const availableBenevolatGivenMissionCount = aggs.length ? aggs[0].benevolat_given[0]?.count || 0 : 0;
  const availableVolontariatGivenMissionCount = aggs.length ? aggs[0].volontariat_given[0]?.count || 0 : 0;
  const availableBenevolatAttributedMissionCount = aggs.length ? aggs[0].benevolat_attributed[0]?.count || 0 : 0;
  const availableVolontariatAttributedMissionCount = aggs.length ? aggs[0].volontariat_attributed[0]?.count || 0 : 0;

  const percentageBenevolatGivenPlaces = availableBenevolatGivenMissionCount / availableBenevolatMissionCount;
  const percentageVolontariatGivenPlaces = availableVolontariatGivenMissionCount / availableVolontariatMissionCount;
  const percentageBenevolatAttributedPlaces = availableBenevolatAttributedMissionCount / availableBenevolatMissionCount;
  const percentageVolontariatAttributedPlaces = availableVolontariatAttributedMissionCount / availableVolontariatMissionCount;

  const statsBenevolatAggs = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must_not: {
            term: { "toPublisherName.keyword": "Service Civique" },
          },
          filter: [{ range: { createdAt: { gte: fromDate, lt: endDate } } }],
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            data: {
              cardinality: { field: "missionId.keyword" },
            },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
        account: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
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
          filter: [{ term: { "toPublisherName.keyword": "Service Civique" } }, { range: { createdAt: { gte: fromDate, lt: endDate } } }],
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
        account: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            data: { cardinality: { field: "missionId.keyword" } },
          },
        },
      },
    },
  });

  const printBenevolat = statsBenevolatAggs.body.aggregations.print.data.value || 0;
  const clickBenevolat = statsBenevolatAggs.body.aggregations.click.data.value || 0;
  const applyBenevolat = statsBenevolatAggs.body.aggregations.apply.data.value || 0;
  const accountBenevolat = statsBenevolatAggs.body.aggregations.account.data.value || 0;

  const printVolontariat = statsVolontariatAggs.body.aggregations.print.data.value || 0;
  const clickVolontariat = statsVolontariatAggs.body.aggregations.click.data.value || 0;
  const applyVolontariat = statsVolontariatAggs.body.aggregations.apply.data.value || 0;
  const accountVolontariat = statsVolontariatAggs.body.aggregations.account.data.value || 0;

  kpi.availableBenevolatMissionCount = availableBenevolatMissionCount;
  kpi.availableVolontariatMissionCount = availableVolontariatMissionCount;

  kpi.availableBenevolatGivenPlaceCount = availableBenevolatGivenPlaceCount;
  kpi.availableVolontariatGivenPlaceCount = availableVolontariatGivenPlaceCount;
  kpi.availableBenevolatAttributedPlaceCount = availableBenevolatAttributedPlaceCount;
  kpi.availableVolontariatAttributedPlaceCount = availableVolontariatAttributedPlaceCount;

  kpi.percentageBenevolatGivenPlaces = percentageBenevolatGivenPlaces;
  kpi.percentageVolontariatGivenPlaces = percentageVolontariatGivenPlaces;
  kpi.percentageBenevolatAttributedPlaces = percentageBenevolatAttributedPlaces;
  kpi.percentageVolontariatAttributedPlaces = percentageVolontariatAttributedPlaces;

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

const handler = async () => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  // build kpi for the last 7 days if not already exists
  for (let i = 0; i < 7; i++) {
    const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);
    const kpi = await KpiModel.findOne({ date: fromDate });
    if (!kpi) await buildDayKpi(fromDate);
    else console.log(`[KPI] KPI already exists for ${fromDate.toISOString()}`);
  }
};

export default { handler };
