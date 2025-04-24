import { Schema, model, models } from "mongoose";
import { WarningBot } from "../../types/index.d";

const MODELNAME = "warning-bot";

const schema = new Schema<WarningBot>(
  {
    hash: { 
      type: String, 
      required: true,
      documentation: {
        description: "Hash du bot",
      },
    },
    userAgent: { 
      type: String, 
      required: true,
      documentation: {
        description: "User agent du bot",
      },
    },
    printCount: { 
      type: Number, 
      required: true, 
      default: 0,
      documentation: {
        description: "Nombre d'impressions",
      },
    },
    clickCount: { 
      type: Number, 
      required: true, 
      default: 0,
      documentation: {
        description: "Nombre de clics",
      },
    },
    applyCount: { 
      type: Number, 
      required: true, 
      default: 0,
      documentation: {
        description: "Nombre de candidatures",
      },
    },
    accountCount: { 
      type: Number, 
      required: true, 
      default: 0,
      documentation: {
        description: "Nombre de créations de compte",
      },
    },
    publisherId: { 
      type: String, 
      required: true,
      documentation: {
        description: "Identifiant de l'éditeur",
      },
    },
    publisherName: { 
      type: String, 
      required: true,
      documentation: {
        description: "Nom de l'éditeur",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ hash: 1 });
schema.index({ publisherId: 1 });

const WarningBotModel = models[MODELNAME] || model<WarningBot>(MODELNAME, schema);

export { WarningBotModel };

