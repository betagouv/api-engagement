import { Schema, model, models } from "mongoose";
import { OrganizationNameMatch } from "../../types/index.d";

const MODELNAME = "organization-name-matches";

const schema = new Schema<OrganizationNameMatch>(
  {
    name: { 
      type: String, 
      unique: true,
      documentation: {
        description: "Nom de l'organisation",
      },
    },
    organizationIds: { 
      type: [String], 
      ref: "organizations",
      documentation: {
        description: "Identifiants des organisations correspondantes",
      },
    },
    organizationNames: { 
      type: [String],
      documentation: {
        description: "Noms des organisations correspondantes",
      },
    },
    missionIds: { 
      type: [String], 
      ref: "missions",
      documentation: {
        description: "Identifiants des missions correspondantes",
      },
    },
    matchCount: { 
      type: Number,
      documentation: {
        description: "Nombre de correspondances",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ name: 1 }, { unique: true });


const OrganizationNameMatchModel = models[MODELNAME] || model<OrganizationNameMatch>(MODELNAME, schema);

export { OrganizationNameMatchModel };
