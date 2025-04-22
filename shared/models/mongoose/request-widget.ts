import { Schema, model } from "mongoose";
import { RequestWidget } from "../../types/index.d";

const MODELNAME = "request-widget";

const schema = new Schema<RequestWidget>(
  {
    query: { 
      type: Object, 
      default: {},
      documentation: {
        description: "Paramu00e8tres de requ00eate pour le widget",
      },
    },
    widgetId: { 
      type: Schema.Types.ObjectId, 
      ref: "widget",
      documentation: {
        description: "ID du widget associé à la requ00eate",
      },
    },
    total: { 
      type: Number, 
      default: 0,
      documentation: {
        description: "Nombre total d'éléments retournés",
      },
    },
    missions: { 
      type: [String], 
      default: [],
      documentation: {
        description: "Liste des IDs de missions retournées",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ widgetId: 1 });
schema.index({ createdAt: 1 });

const RequestWidgetModel = model<RequestWidget>(MODELNAME, schema);

export { RequestWidgetModel };
