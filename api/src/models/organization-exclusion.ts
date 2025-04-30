import { Schema, model } from "mongoose";

import { OrganizationExclusion } from "../types";

const MODELNAME = "organization-exclusion";

const schema = new Schema<OrganizationExclusion>(
  {
    excludedByPublisherId: { type: String, ref: "publisher" },
    excludedByPublisherName: { type: String, required: true, trim: true },

    excludedForPublisherId: { type: String, ref: "publisher" },
    excludedForPublisherName: { type: String, required: true, trim: true },

    organizationClientId: { type: String },
    organizationName: { type: String, trim: true },
  },
  { timestamps: true },
);

schema.index({ excludedByPublisherId: 1, excludedForPublisherId: 1, organizationClientId: 1 }, { unique: true });
schema.index({ excludedForPublisherId: 1 });

const OrganizationExclusionModel = model<OrganizationExclusion>(MODELNAME, schema);
export default OrganizationExclusionModel;
