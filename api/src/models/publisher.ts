import { Schema, model } from "mongoose";

import { Publisher } from "../types";

const MODELNAME = "publisher";

const publisherSchema = new Schema<Publisher["publishers"][0]>(
  {
    publisherId: { type: String, ref: "publisher" },
    publisherName: { type: String, required: true, trim: true },
    moderator: { type: Boolean, default: false },
    missionType: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
    excludedOrganisations: { type: [String] },
    // Old to migrate
    publisher: { type: String, ref: "publisher" },
    mission_type: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
  },
  { timestamps: true },
);

const schema = new Schema<Publisher>(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "inactive"] },
    category: { type: String, default: "OTHERS" },
    automated_report: { type: Boolean, default: false },
    send_report_to: { type: [String] },
    mission_type: { type: String, default: null, enum: ["benevolat", "volontariat", null] },
    role_promoteur: { type: Boolean, default: false },
    role_annonceur_api: { type: Boolean, default: false },
    role_annonceur_widget: { type: Boolean, default: false },
    role_annonceur_campagne: { type: Boolean, default: false },

    url: { type: String },

    moderator: { type: Boolean, default: false },
    moderatorLink: { type: String },
    email: { type: String },

    documentation: { type: String },
    logo: { type: String },
    feed: { type: String },
    apikey: { type: String },
    lastSyncAt: { type: Date },

    publishers: { type: [publisherSchema] },

    excludeOrganisations: { type: [String] },
    excludedOrganisations: { type: [String] },

    description: { type: String, default: "" },

    lead: { type: String, default: "" },

    deletedAt: { type: Date, default: null },

    // Depreciated
    lastFetchAt: { type: Date },
    acceptedCount: { type: Number, default: 0 },
    refusedCount: { type: Number, default: 0 },
    updated_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true },
);

const PublisherModel = model<Publisher>(MODELNAME, schema);
export default PublisherModel;
