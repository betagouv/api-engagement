import { Schema, model } from "mongoose";
import { ImportRna } from "../types";

const MODELNAME = "import-rna";

const schema = new Schema<ImportRna>(
  {
    year: {
      type: Number,
    },
    month: {
      type: Number,
    },
    resourceId: {
      type: String,
    },
    resourceCreatedAt: {
      type: Date,
    },
    resourceUrl: {
      type: String,
    },
    count: {
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
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const ImportRnaModal = model<ImportRna>(MODELNAME, schema);
export default ImportRnaModal;
