import { Schema, model } from "mongoose";
import { StatsBot } from "../../types/index.d";

const MODELNAME = "stats-bot";

const schema = new Schema<StatsBot>(
  {
    origin: { 
      type: String,
      documentation: {
        description: "Origine de la requête",
      },
    },
    referer: { 
      type: String,
      documentation: {
        description: "Référent de la requête",
      },
    },
    userAgent: { 
      type: String,
      documentation: {
        description: "User-Agent du bot",
      },
    },
    host: { 
      type: String,
      documentation: {
        description: "Hôte de la requête",
      },
    },
    user: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      documentation: {
        description: "Identifiant unique du bot",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ user: 1 }, { unique: true });
schema.index({ createdAt: 1 });

const StatsBotModel = model<StatsBot>(MODELNAME, schema);

export { StatsBotModel };
