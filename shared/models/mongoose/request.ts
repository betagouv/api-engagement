import { Schema, model, models } from "mongoose";

import { Request } from "../../types";

const MODELNAME = "request";
const schema = new Schema<Request>({
  route: {
    type: String,
    required: true,
  },
  query: {
    type: Object,
    default: {},
  },
  params: {
    type: Object,
    default: {},
  },
  method: {
    type: String,
    required: true,
    enum: ["GET", "POST", "PUT", "DELETE"],
  },
  key: {
    type: String,
  },
  header: {
    type: Object,
    default: {},
  },
  body: {
    type: Object,
    default: {},
  },
  status: {
    type: Number,
    default: 200,
  },
  code: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  total: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RequestModel = models[MODELNAME] || model<Request>(MODELNAME, schema);

export { RequestModel };