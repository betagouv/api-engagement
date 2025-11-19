import { captureException } from "../../error";
import KpiBotlessModel from "../../models/kpi-botless";
import MissionModel from "../../models/mission";
import StatsBotModel from "../../models/stats-bot";
import { statEventService } from "../../services/stat-event";
import { Kpi } from "../../types";
import { safeDivision } from "./utils/math";

// Cron that create a kpi doc every with the data available
export const buildKpiBotless = async (start: Date): Promise<Kpi | null> => {
  const body = { date: start } as Kpi;
  try {
    const exists = await KpiBotlessModel.findOne({ date: start });
    if (exists) {
      console.log(`[KPI Botless] KPI already exists for ${start.toISOString()}`);
      return exists;
    }

    console.log(`[KPI Botless] Starting at ${start.toISOString()}`);

    // Get the previous day
    const fromDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
    const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

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
          benevolat_given: [
            { $match: { ...whereBenevolatAvailable, placesStatus: "GIVEN_BY_PARTNER" } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$places" } } },
          ],
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

    const percentageBenevolatGivenPlaces = safeDivision(availableBenevolatGivenMissionCount, availableBenevolatMissionCount);
    const percentageVolontariatGivenPlaces = safeDivision(availableVolontariatGivenMissionCount, availableVolontariatMissionCount);
    const percentageBenevolatAttributedPlaces = safeDivision(availableBenevolatAttributedMissionCount, availableBenevolatMissionCount);
    const percentageVolontariatAttributedPlaces = safeDivision(availableVolontariatAttributedMissionCount, availableVolontariatMissionCount);

    const statsBots = await StatsBotModel.find({}).lean();

    const excludeUsers = statsBots.map((e) => e.user).filter(Boolean) as string[];

    const statsBenevolatAggs = await statEventService.aggregateStatEventsForMission({
      from: fromDate,
      to: endDate,
      excludeToPublisherName: "Service Civique",
      excludeUsers,
    });

    const statsVolontariatAggs = await statEventService.aggregateStatEventsForMission({
      from: fromDate,
      to: endDate,
      toPublisherName: "Service Civique",
      excludeUsers,
    });

    body.availableBenevolatMissionCount = availableBenevolatMissionCount;
    body.availableVolontariatMissionCount = availableVolontariatMissionCount;

    body.availableJvaMissionCount = availableJvaMissionCount;

    body.availableBenevolatGivenPlaceCount = availableBenevolatGivenPlaceCount;
    body.availableVolontariatGivenPlaceCount = availableVolontariatGivenPlaceCount;
    body.availableBenevolatAttributedPlaceCount = availableBenevolatAttributedPlaceCount;
    body.availableVolontariatAttributedPlaceCount = availableVolontariatAttributedPlaceCount;

    body.percentageBenevolatGivenPlaces = percentageBenevolatGivenPlaces;
    body.percentageVolontariatGivenPlaces = percentageVolontariatGivenPlaces;
    body.percentageBenevolatAttributedPlaces = percentageBenevolatAttributedPlaces;
    body.percentageVolontariatAttributedPlaces = percentageVolontariatAttributedPlaces;

    body.benevolatPrintMissionCount = statsBenevolatAggs.print.missionCount;
    body.volontariatPrintMissionCount = statsVolontariatAggs.print.missionCount;

    body.benevolatClickMissionCount = statsBenevolatAggs.click.missionCount;
    body.volontariatClickMissionCount = statsVolontariatAggs.click.missionCount;

    body.benevolatApplyMissionCount = statsBenevolatAggs.apply.missionCount;
    body.volontariatApplyMissionCount = statsVolontariatAggs.apply.missionCount;

    body.benevolatAccountMissionCount = statsBenevolatAggs.account.missionCount;
    body.volontariatAccountMissionCount = statsVolontariatAggs.account.missionCount;

    body.benevolatPrintCount = statsBenevolatAggs.print.eventCount;
    body.volontariatPrintCount = statsVolontariatAggs.print.eventCount;

    body.benevolatClickCount = statsBenevolatAggs.click.eventCount;
    body.volontariatClickCount = statsVolontariatAggs.click.eventCount;

    body.benevolatApplyCount = statsBenevolatAggs.apply.eventCount;
    body.volontariatApplyCount = statsVolontariatAggs.apply.eventCount;

    body.benevolatAccountCount = statsBenevolatAggs.account.eventCount;
    body.volontariatAccountCount = statsVolontariatAggs.account.eventCount;

    const data = await KpiBotlessModel.create(body);
    console.log(`[KPI Botless] Created kpi for ${start.toISOString()}`);
    return data;
  } catch (error) {
    captureException(error, { extra: { kpi: body, start } });
  }
  return null;
};
