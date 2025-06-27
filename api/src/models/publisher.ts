import { Schema, model } from "mongoose";

import { Diffuseur, MissionType, Publisher } from "../types";

const MODELNAME = "publisher";

const publisherSchema = new Schema<Diffuseur>(
  {
    publisherId: { type: String, ref: "publisher" },
    publisherName: { type: String, required: true, trim: true },
    moderator: { type: Boolean, default: false },
    missionType: { type: String, default: MissionType.BENEVOLAT, enum: [MissionType.BENEVOLAT, MissionType.VOLONTARIAT, null] },
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

    // missionType: { type: String, default: MissionType.BENEVOLAT, enum: [MissionType.BENEVOLAT, MissionType.VOLONTARIAT, null] },
    missionType: { type: String, default: MissionType.BENEVOLAT, enum: [MissionType.BENEVOLAT, MissionType.VOLONTARIAT] },

    isAnnonceur: { type: Boolean, default: false },
    hasApiRights: { type: Boolean, default: false },
    hasWidgetRights: { type: Boolean, default: false },
    hasCampaignRights: { type: Boolean, default: false },

    sendReport: { type: Boolean, default: false },
    sendReportTo: { type: [String], default: [] },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const PublisherModel = model<Publisher>(MODELNAME, schema);
export default PublisherModel;
