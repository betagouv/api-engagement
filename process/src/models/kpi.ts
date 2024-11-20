import { Schema, model } from "mongoose";

import { Kpi } from "../types";

const MODELNAME = "kpi";
const schema = new Schema<Kpi>(
  {
    date: { type: Date, required: true, unique: true },
    availableBenevolatMissionCount: { type: Number },
    availableVolontariatMissionCount: { type: Number },

    availableBenevolatGivenPlaceCount: { type: Number },
    availableVolontariatGivenPlaceCount: { type: Number },

    availableBenevolatAttributedPlaceCount: { type: Number },
    availableVolontariatAttributedPlaceCount: { type: Number },

    percentageBenevolatGivenPlaces: { type: Number },
    percentageVolontariatGivenPlaces: { type: Number },

    percentageBenevolatAttributedPlaces: { type: Number },
    percentageVolontariatAttributedPlaces: { type: Number },

    benevolatPrintMissionCount: { type: Number },
    volontariatPrintMissionCount: { type: Number },

    benevolatClickMissionCount: { type: Number },
    volontariatClickMissionCount: { type: Number },

    benevolatApplyMissionCount: { type: Number },
    volontariatApplyMissionCount: { type: Number },

    benevolatAccountMissionCount: { type: Number },
    volontariatAccountMissionCount: { type: Number },
  },
  { timestamps: true },
);

const KpiModel = model<Kpi>(MODELNAME, schema);
export default KpiModel;
