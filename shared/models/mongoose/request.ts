import { Schema, model } from "mongoose";
import { Request } from "../../types/index.d";

const MODELNAME = "request";

const schema = new Schema<Request>({
  route: {
    type: String,
    required: true,
    documentation: {
      description: "Route de la requ00eate HTTP",
    },
  },
  query: {
    type: Object,
    default: {},
    documentation: {
      description: "Paramu00e8tres de requ00eate (query string)",
    },
  },
  params: {
    type: Object,
    default: {},
    documentation: {
      description: "Paramu00e8tres de route",
    },
  },
  method: {
    type: String,
    required: true,
    enum: ["GET", "POST", "PUT", "DELETE"],
    documentation: {
      description: "Méthode HTTP",
    },
  },
  key: {
    type: String,
    documentation: {
      description: "Clé d'identification de la requ00eate",
    },
  },
  header: {
    type: Object,
    default: {},
    documentation: {
      description: "En-tu00eates HTTP",
    },
  },
  body: {
    type: Object,
    default: {},
    documentation: {
      description: "Corps de la requ00eate",
    },
  },
  status: {
    type: Number,
    default: 200,
    documentation: {
      description: "Code de statut HTTP de la réponse",
    },
  },
  code: {
    type: String,
    default: "",
    documentation: {
      description: "Code d'erreur ou de réussite",
    },
  },
  message: {
    type: String,
    default: "",
    documentation: {
      description: "Message d'erreur ou de réussite",
    },
  },
  total: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre total d'éléments retournés",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    documentation: {
      description: "Date de création de la requ00eate",
    },
  },
});

// Indexes
schema.index({ route: 1 });
schema.index({ method: 1 });
schema.index({ createdAt: 1 });
schema.index({ status: 1 });

const RequestModel = model<Request>(MODELNAME, schema);

export { RequestModel };
