import { Schema, model } from "mongoose";

import { Report } from "../types";

const MODELNAME = "report";
const schema = new Schema<Report>(
  {
    name: { type: String, required: true, trim: true },

    month: { type: Number, required: true },
    year: { type: Number, required: true },
    url: { type: String, trim: true, default: null },
    objectName: { type: String, trim: true, default: null },

    publisherId: { type: String, required: true, trim: true, ref: "publisher" },
    publisherName: { type: String, required: true, trim: true },

    dataTemplate: { type: String, enum: ["BOTH", "RECEIVE", "SEND", null], default: null },
    sentAt: { type: Date, default: null },
    sentTo: { type: [String], default: [] },

    status: { type: String },

    data: { type: Object, default: {} },
  },
  {
    timestamps: true,
  }
);

schema.index({ publisherId: 1, month: 1, year: 1 }, { unique: true });

const ReportModel = model<Report>(MODELNAME, schema);
export default ReportModel;
