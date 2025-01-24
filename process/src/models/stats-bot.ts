import { Schema, model } from "mongoose";

import { StatsBot } from "../types";

const MODELNAME = "stats-bot";
const schema = new Schema<StatsBot>(
  {
    origin: { type: String },
    referer: { type: String },
    userAgent: { type: String },
    host: { type: String },
    user: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

const StatsBotModel = model<StatsBot>(MODELNAME, schema);
export default StatsBotModel;
