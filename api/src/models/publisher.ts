import { Schema, model } from "mongoose";

import { Diffuseur, Publisher } from "../types";

const MODELNAME = "publisher";

const publisherSchema = new Schema<Diffuseur>(
  {
    publisherId: { type: String, ref: "publisher" },
    publisherName: { type: String, required: true, trim: true },
    moderator: { type: Boolean, default: false },
    missionType: { type: String, default: null, enum: ["benevolat", "volontariat", null] },

    // // Old to migrate
    // publisher: { type: String, ref: "publisher" },
    // mission_type: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
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
    apikey: { type: String },

    publishers: { type: [publisherSchema] },
    description: { type: String, default: "" },

    missionType: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
    annonceur: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
    widget: { type: Boolean, default: false },
    campaign: { type: Boolean, default: false },

    sendReport: { type: Boolean, default: false },
    sendReportTo: { type: [String] },

    deletedAt: { type: Date, default: null },

    // lead: { type: String, default: "" },
    // Depreciated
    // status: { type: String, enum: ["active", "inactive"] },
    // lastSyncAt: { type: Date },
    // automated_report: { type: Boolean, default: false },
    // send_report_to: { type: [String] },

    // mission_type: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
    // role_promoteur: { type: Boolean, default: false },
    // role_annonceur_api: { type: Boolean, default: false },
    // role_annonceur_widget: { type: Boolean, default: false },
    // role_annonceur_campagne: { type: Boolean, default: false },

    // excludeOrganisations: { type: [String] },
    // // excludedOrganisations: { type: [excludedOrganizationSchema] },
    // lastFetchAt: { type: Date },
    // acceptedCount: { type: Number, default: 0 },
    // refusedCount: { type: Number, default: 0 },
    // updated_at: { type: Date, default: Date.now },
    // created_at: { type: Date, default: Date.now },
    // deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

const PublisherModel = model<Publisher>(MODELNAME, schema);
export default PublisherModel;
