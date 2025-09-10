import { Kpi as PgKpi } from "@prisma/client";
import { prismaAnalytics as prisma } from "../../../db/postgres";

import { captureException } from "../../../error";
import KpiModel from "../../../models/kpi";
import { Kpi } from "../../../types";

const buildData = (doc: Kpi) => {
  const obj = {
    old_id: doc._id.toString(),
    date: doc.date,
    available_benevolat_mission_count: doc.availableBenevolatMissionCount,
    available_volontariat_mission_count: doc.availableVolontariatMissionCount,

    available_jva_mission_count: doc.availableJvaMissionCount,

    available_benevolat_given_by_partner_place_count: doc.availableBenevolatGivenPlaceCount,
    available_volontariat_given_by_partner_place_count: doc.availableVolontariatGivenPlaceCount,

    available_benevolat_attributed_by_api_place_count: doc.availableBenevolatAttributedPlaceCount,
    available_volontariat_attributed_by_api_place_count: doc.availableVolontariatAttributedPlaceCount,

    percentage_benevolat_given_by_partner_places: doc.percentageBenevolatGivenPlaces,
    percentage_volontariat_given_by_partner_places: doc.percentageVolontariatGivenPlaces,

    percentage_benevolat_attributed_by_api_places: doc.percentageBenevolatAttributedPlaces,
    percentage_volontariat_attributed_by_api_places: doc.percentageVolontariatAttributedPlaces,

    benevolat_print_mission_count: doc.benevolatPrintMissionCount,
    volontariat_print_mission_count: doc.volontariatPrintMissionCount,

    benevolat_click_mission_count: doc.benevolatClickMissionCount,
    volontariat_click_mission_count: doc.volontariatClickMissionCount,

    benevolat_apply_mission_count: doc.benevolatApplyMissionCount,
    volontariat_apply_mission_count: doc.volontariatApplyMissionCount,

    benevolat_account_mission_count: doc.benevolatAccountMissionCount,
    volontariat_account_mission_count: doc.volontariatAccountMissionCount,

    benevolat_print_count: doc.benevolatPrintCount,
    volontariat_print_count: doc.volontariatPrintCount,

    benevolat_click_count: doc.benevolatClickCount,
    volontariat_click_count: doc.volontariatClickCount,

    benevolat_apply_count: doc.benevolatApplyCount,
    volontariat_apply_count: doc.volontariatApplyCount,

    benevolat_account_count: doc.benevolatAccountCount,
    volontariat_account_count: doc.volontariatAccountCount,
  } as PgKpi;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[KPI] Starting at ${start.toISOString()}`);

    const data = await KpiModel.find().lean();
    console.log(`[KPI] Found ${data.length} docs to sync.`);

    const stored = [] as string[];
    await prisma.kpiBotLess.findMany({ select: { old_id: true } }).then((data) => data.forEach((d) => stored.push(d.old_id)));
    console.log(`[KPI] Found ${stored.length} docs in database.`);

    const dataToCreate = [];
    for (const doc of data) {
      const exists = stored.includes(doc._id.toString());
      if (exists) {
        continue;
      }
      const obj = buildData(doc as Kpi);
      dataToCreate.push(obj);
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[KPI] Creating ${dataToCreate.length} docs...`);
      const res = await prisma.kpiBotLess.createMany({ data: dataToCreate, skipDuplicates: true });
      console.log(`[KPI] Created ${res.count} docs.`);
    }

    console.log(`[KPI] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length };
  } catch (error) {
    captureException(error, "[KPI] Error while syncing docs.");
  }
};

export default handler;
