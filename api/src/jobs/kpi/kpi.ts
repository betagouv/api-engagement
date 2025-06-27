import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import KpiModel from "../../models/kpi";
import MissionModel from "../../models/mission";
import { Kpi } from "../../types";

// Cron that create a kpi doc every with the data available
export const buildKpi = async (start: Date): Promise<Kpi | null> => {
  const exists = await KpiModel.findOne({ date: start });
  if (exists) {
    console.log(`[KPI] KPI already exists for ${start.toISOString()}`);
    return null;
  }

  console.log(`[KPI] Starting at ${start.toISOString()}`);

  // Get the previous day
  const fromDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const kpi = { date: start } as Kpi;

  const whereMissionAvailable = {
    $or: [{ deletedAt: { $gte: fromDate } }, { deleted: false }],
    createdAt: { $lt: endDate },
  };

  const whereBenevolatAvailable = {
    ...whereMissionAvailable,
    publisherName: { $ne: "Service Civique" },
  };
  const whereVolontariatAvailable = { ...whereMissionAvailable, publisherName: "Service Civique" };

  const whereJvaAvailable = { ...whereMissionAvailable, publisherName: "JeVeuxAider.gouv.fr" };

  const availableBenevolatMissionCount = await MissionModel.countDocuments(whereBenevolatAvailable);
  const availableVolontariatMissionCount = await MissionModel.countDocuments(whereVolontariatAvailable);

  const availableJvaMissionCount = await MissionModel.countDocuments(whereJvaAvailable);

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

  kpi.availableBenevolatMissionCount = availableBenevolatMissionCount;
  kpi.availableVolontariatMissionCount = availableVolontariatMissionCount;

  kpi.availableJvaMissionCount = availableJvaMissionCount;

  kpi.availableBenevolatGivenPlaceCount = availableBenevolatGivenPlaceCount;
  kpi.availableVolontariatGivenPlaceCount = availableVolontariatGivenPlaceCount;
  kpi.availableBenevolatAttributedPlaceCount = availableBenevolatAttributedPlaceCount;
  kpi.availableVolontariatAttributedPlaceCount = availableVolontariatAttributedPlaceCount;

  kpi.percentageBenevolatGivenPlaces = percentageBenevolatGivenPlaces;
  kpi.percentageVolontariatGivenPlaces = percentageVolontariatGivenPlaces;
  kpi.percentageBenevolatAttributedPlaces = percentageBenevolatAttributedPlaces;
  kpi.percentageVolontariatAttributedPlaces = percentageVolontariatAttributedPlaces;

  kpi.benevolatPrintMissionCount = statsBenevolatAggs.body.aggregations.print.data.value || 0;
  kpi.volontariatPrintMissionCount = statsVolontariatAggs.body.aggregations.print.data.value || 0;

  kpi.benevolatClickMissionCount = statsBenevolatAggs.body.aggregations.click.data.value || 0;
  kpi.volontariatClickMissionCount = statsVolontariatAggs.body.aggregations.click.data.value || 0;

  kpi.benevolatApplyMissionCount = statsBenevolatAggs.body.aggregations.apply.data.value || 0;
  kpi.volontariatApplyMissionCount = statsVolontariatAggs.body.aggregations.apply.data.value || 0;

  kpi.benevolatAccountMissionCount = statsBenevolatAggs.body.aggregations.account.data.value || 0;
  kpi.volontariatAccountMissionCount = statsVolontariatAggs.body.aggregations.account.data.value || 0;

  kpi.benevolatPrintCount = statsBenevolatAggs.body.aggregations.print.doc_count || 0;
  kpi.volontariatPrintCount = statsVolontariatAggs.body.aggregations.print.doc_count || 0;

  kpi.benevolatClickCount = statsBenevolatAggs.body.aggregations.click.doc_count || 0;
  kpi.volontariatClickCount = statsVolontariatAggs.body.aggregations.click.doc_count || 0;

  kpi.benevolatApplyCount = statsBenevolatAggs.body.aggregations.apply.doc_count || 0;
  kpi.volontariatApplyCount = statsVolontariatAggs.body.aggregations.apply.doc_count || 0;

  kpi.benevolatAccountCount = statsBenevolatAggs.body.aggregations.account.doc_count || 0;
  kpi.volontariatAccountCount = statsVolontariatAggs.body.aggregations.account.doc_count || 0;

  await KpiModel.create(kpi);

  console.log(`[KPI] Created kpi for ${start.toISOString()}`);

  return kpi;
};
