import { Schema, model } from "mongoose";

import { OrganizationNameMatch } from "../types";

const MODELNAME = "organization-name-matches";

const schema = new Schema<OrganizationNameMatch>(
  {
    name: { type: String, description: "Name", unique: true },
    organizationIds: { type: [String], description: "Organization matched ids", ref: "organizations" },
    organizationNames: { type: [String], description: "Organization matched names" },
    missionIds: { type: [String], description: "Mission matched ids", ref: "missions" },
    matchCount: { type: Number, description: "Match count" },
  },
  { timestamps: true },
);

schema.index({ name: 1 }, { unique: true });

const OrganizationNameMatchModel = model<OrganizationNameMatch>(MODELNAME, schema);
export default OrganizationNameMatchModel;
