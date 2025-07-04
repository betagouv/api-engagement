import { Schema, model } from "mongoose";

import { WarningBot } from "../types";

const MODELNAME = "warning-bot";
const schema = new Schema<WarningBot>(
  {
    hash: { type: String, required: true, description: "Hash of the bot" },
    userAgent: { type: String, required: true, description: "User agent of the bot" },
    printCount: { type: Number, required: true, default: 0 },
    clickCount: { type: Number, required: true, default: 0 },
    applyCount: { type: Number, required: true, default: 0 },
    accountCount: { type: Number, required: true, default: 0 },
    publisherId: { type: String, required: true, description: "Publisher ID" },
    publisherName: { type: String, required: true, description: "Publisher name" },
  },
  { timestamps: true }
);

const WarningBotModel = model<WarningBot>(MODELNAME, schema);
export default WarningBotModel;
