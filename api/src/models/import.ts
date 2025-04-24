import { Schema, model, models } from "mongoose";

import { Import } from "../types";

const MODELNAME = "import";
const schema = new Schema<Import>({
  name: {
    type: String,
    required: true,
  },
  publisherId: {
    type: String,
  },
  createdCount: {
    type: Number,
    default: 0,
  },
  deletedCount: {
    type: Number,
    default: 0,
  },
  updatedCount: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  endedAt: {
    type: Date,
    required: true,
  },
});

// Add index on publisherId
schema.index({ publisherId: 1 });

const ImportModel = models[MODELNAME] || model<Import>(MODELNAME, schema);
export default ImportModel;
