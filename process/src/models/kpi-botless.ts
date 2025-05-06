import { Schema, model } from "mongoose";

import { Kpi } from "../types";

const MODELNAME = "kpi-botless";
const schema = new Schema<Kpi>(
  {
    date: { type: Date, required: true, unique: true },
    availableBenevolatMissionCount: { type: Number },
    availableVolontariatMissionCount: { type: Number },

    availableJvaMissionCount: { type: Number },

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

    benevolatPrintCount: { type: Number },
    volontariatPrintCount: { type: Number },

    benevolatClickCount: { type: Number },
    volontariatClickCount: { type: Number },

    benevolatApplyCount: { type: Number },
    volontariatApplyCount: { type: Number },

    benevolatAccountCount: { type: Number },
    volontariatAccountCount: { type: Number },
  },
  { timestamps: true },
);

const KpiBotlessModel = model<Kpi>(MODELNAME, schema);
export default KpiBotlessModel;
