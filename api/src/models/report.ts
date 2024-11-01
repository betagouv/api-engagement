import { Schema, model } from "mongoose";

import { Report } from "../types";

const MODELNAME = "report";
const schema = new Schema<Report>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      documentation: {
        description: "Name of the report",
      },
    },

    month: {
      type: Number,
      required: true,
      documentation: {
        description: "Month of the report",
      },
    },
    year: {
      type: Number,
      required: true,
      documentation: {
        description: "Year of the report",
      },
    },
    url: {
      type: String,
      trim: true,
      documentation: {
        description: "Url of the report",
      },
    },
    objectName: {
      type: String,
      trim: true,
      documentation: {
        description: "Object name in s3 of the report",
      },
    },

    publisherId: {
      type: String,
      required: true,
      trim: true,
      ref: "publisher",
      documentation: {
        description: "Publisher Id",
      },
    },
    publisherName: {
      type: String,
      required: true,
      trim: true,
      documentation: {
        description: "Publisher name",
      },
    },

    dataTemplate: {
      type: String,
      enum: ["BOTH", "RECEIVE", "SEND", "NONE"],
      documentation: {
        description: "Data template",
      },
    },

    clicksFrom: {
      type: Number,
      documentation: {
        description: "Clicks from",
      },
    },

    clicksTo: {
      type: Number,
      documentation: {
        description: "Clicks to",
      },
    },

    applyFrom: {
      type: Number,
      documentation: {
        description: "Apply from",
      },
    },

    applyTo: {
      type: Number,
      documentation: {
        description: "Apply to",
      },
    },

    sent: {
      type: Boolean,
      default: false,
      documentation: {
        description: "Report sent",
      },
    },

    sentAt: {
      type: Date,
      documentation: {
        description: "Date of sending",
      },
    },
    sentTo: {
      type: [String],
      documentation: {
        description: "List of emails the report was sent to",
      },
    },
    createdAt: {
      type: Date,
      documentation: {
        description: "Date of creation",
      },
    },
    updatedAt: {
      type: Date,
      documentation: {
        description: "Date of last update",
      },
    },
    data: {
      type: Object,
      documentation: {
        description: "Data of the report",
      },
    },

    error: {
      type: String,
      documentation: {
        description: "Error message",
      },
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ publisherId: 1, month: 1, year: 1 }, { unique: true });

const ReportModel = model<Report>(MODELNAME, schema);
export default ReportModel;
