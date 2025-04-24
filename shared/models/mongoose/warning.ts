import { Schema, model, models } from "mongoose";
import { Warning } from "../../types/index.d";

const MODELNAME = "warning";

const schema = new Schema<Warning>(
  {
    type: { 
      type: String, 
      required: true,
      documentation: {
        description: "Type de l'avertissement",
      },
    },
    title: { 
      type: String,
      documentation: {
        description: "Titre de l'avertissement",
      },
    },
    description: { 
      type: String,
      documentation: {
        description: "Détails de l'avertissement, principalement l'erreur associée",
      },
    },
    publisherId: { 
      type: String, 
      required: true,
      documentation: {
        description: "ID du publisher",
      },
    },
    publisherName: { 
      type: String, 
      required: true,
      documentation: {
        description: "Nom du publisher",
      },
    },
    publisherLogo: { 
      type: String, 
      required: true,
      documentation: {
        description: "Logo du publisher",
      },
    },
    seen: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si l'avertissement a été vu",
      },
    },
    fixed: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si l'avertissement a été résolu",
      },
    },
    fixedAt: { 
      type: Date,
      documentation: {
        description: "Date de résolution",
      },
    },
    occurrences: { 
      type: Number, 
      default: 1,
      documentation: {
        description: "Nombre de fois que l'avertissement a été détecté",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ publisherId: 1 });
schema.index({ type: 1 });
schema.index({ seen: 1 });
schema.index({ fixed: 1 });
schema.index({ createdAt: 1 });

const WarningModel = models[MODELNAME] || model<Warning>(MODELNAME, schema);

export { WarningModel };
