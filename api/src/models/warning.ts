import { Schema, model } from "mongoose";

import { Warning } from "../types";

const MODELNAME = "warning";
const schema = new Schema<Warning>(
  {
    type: { type: String, required: true, description: "Type of the warning" },
    title: { type: String, description: "Title of the warning" },
    description: {
      type: String,
      description: "Details of the warning, mostly the error associated",
    },
    publisherId: { type: String, required: true, description: "Publisher ID" },
    publisherName: { type: String, required: true, description: "Publisher name" },
    publisherLogo: { type: String, required: true, description: "Publisher logo" },
    seen: { type: Boolean, default: false, description: "If the warning have been seen" },
    fixed: { type: Boolean, default: false, description: "If the warning has been fixed" },
    fixedAt: { type: Date, description: "Date of the fix" },
    occurrences: {
      type: Number,
      default: 1,
      description: "Number of time the warning as been detected",
    },
  },
  { timestamps: true }
);

const WarningModel = model<Warning>(MODELNAME, schema);
export default WarningModel;
