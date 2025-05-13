import { Schema, model } from "mongoose";

import { Diffuseur, Publisher } from "../types";

const MODELNAME = "publisher";

const publisherSchema = new Schema<Diffuseur>(
  {
    publisherId: { type: String, ref: "publisher" },
    publisherName: { type: String, required: true, trim: true },
    moderator: { type: Boolean, default: false },
    missionType: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
  },
  { timestamps: true }
);

const schema = new Schema<Publisher>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: null },

    url: { type: String },

    moderator: { type: Boolean, default: false },
    moderatorLink: { type: String },
    email: { type: String },

    documentation: { type: String },
    logo: { type: String },
    lead: { type: String },
    feed: { type: String },
    feedUsername: { type: String },
    feedPassword: { type: String },
    apikey: { type: String },

    publishers: { type: [publisherSchema] },
    description: { type: String, default: "" },

    missionType: { type: String, default: null, enum: ["benevolat", "volontariat", null] },

    isAnnonceur: { type: Boolean, default: false },
    // annonceur: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
    widget: { type: Boolean, default: false },
    campaign: { type: Boolean, default: false },

    sendReport: { type: Boolean, default: false },
    sendReportTo: { type: [String] },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const PublisherModel = model<Publisher>(MODELNAME, schema);
export default PublisherModel;
