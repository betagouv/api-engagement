import { Schema, model } from "mongoose";

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
  missionCount: {
    type: Number,
    default: 0,
  },
  refusedCount: {
    type: Number,
    default: 0,
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
    default: null,
  },
  status: {
    type: String,
    required: true,
  },
  failed: {
    // any[]
    type: Object,
    default: [],
  },
});

// Add index on publisherId
schema.index({ publisherId: 1 });

const ImportModel = model<Import>(MODELNAME, schema);
export default ImportModel;
