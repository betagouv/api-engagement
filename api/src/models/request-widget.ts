import { Schema, model } from "mongoose";

import { RequestWidget } from "../types";

const MODELNAME = "request-widget";
const schema = new Schema<RequestWidget>({
  query: {
    type: Object,
    default: {},
  },
  widgetId: {
    type: Schema.Types.ObjectId,
    ref: "widget",
  },
  total: {
    type: Number,
    default: 0,
  },
  missions: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RequestWidget = model<RequestWidget>(MODELNAME, schema);
export default RequestWidget;
