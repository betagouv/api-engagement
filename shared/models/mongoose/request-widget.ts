import { Schema, model, models } from "mongoose";

import { RequestWidget } from "../../types";

const MODELNAME = "request-widget";
const schema = new Schema<RequestWidget>(
  {
    query: { type: Object, default: {} },
    widgetId: { type: Schema.Types.ObjectId, ref: "widget" },
    total: { type: Number, default: 0 },
    missions: { type: [String], default: [] },
  },
  { timestamps: true },
);

const RequestWidgetModel = models[MODELNAME] || model<RequestWidget>(MODELNAME, schema);

export { RequestWidgetModel };