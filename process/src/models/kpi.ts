import { Schema, model } from "mongoose";

import { Kpi } from "../types";

const MODELNAME = "kpi";
const schema = new Schema<Kpi>(
  {
    date: { type: Date, required: true },
    benevolatAvailableMissionCount: { type: Number, required: true },
    volontariatAvailableMissionCount: { type: Number, required: true },
    availablePlaceCount: { type: Number, required: true },
    availableMissionCount: { type: Number, required: true },
    activeMissionCount: { type: Number, required: true },
  },
  { timestamps: true },
);

const KpiModel = model<Kpi>(MODELNAME, schema);
export default KpiModel;
