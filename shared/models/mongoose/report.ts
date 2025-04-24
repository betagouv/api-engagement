import { Schema, model, models } from "mongoose";
import { Report } from "../../types/index.d";

const MODELNAME = "report";

const schema = new Schema<Report>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      documentation: {
        description: "Nom du rapport",
      },
    },

    month: { 
      type: Number, 
      required: true,
      documentation: {
        description: "Mois du rapport (1-12)",
      },
    },
    year: { 
      type: Number, 
      required: true,
      documentation: {
        description: "Année du rapport",
      },
    },
    url: { 
      type: String, 
      trim: true, 
      default: null,
      documentation: {
        description: "URL du rapport généré",
      },
    },
    objectName: { 
      type: String, 
      trim: true, 
      default: null,
      documentation: {
        description: "Nom de l'objet de stockage du rapport",
      },
    },

    publisherId: { 
      type: String, 
      required: true, 
      trim: true, 
      ref: "publisher",
      documentation: {
        description: "ID du publisher associé au rapport",
      },
    },
    publisherName: { 
      type: String, 
      required: true, 
      trim: true,
      documentation: {
        description: "Nom du publisher associé au rapport",
      },
    },

    dataTemplate: { 
      type: String, 
      enum: ["BOTH", "RECEIVE", "SEND", null], 
      default: null,
      documentation: {
        description: "Type de template de données utilisé pour le rapport",
      },
    },
    sentAt: { 
      type: Date, 
      default: null,
      documentation: {
        description: "Date d'envoi du rapport",
      },
    },
    sentTo: { 
      type: [String], 
      default: [],
      documentation: {
        description: "Liste des destinataires du rapport",
      },
    },

    status: { 
      type: String,
      documentation: {
        description: "Statut du rapport",
      },
    },

    data: { 
      type: Object, 
      default: {},
      documentation: {
        description: "Données du rapport",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ publisherId: 1, month: 1, year: 1 }, { unique: true });
schema.index({ publisherId: 1 });
schema.index({ month: 1, year: 1 });
schema.index({ createdAt: 1 });

const ReportModel = models[MODELNAME] || model<Report>(MODELNAME, schema);

export { ReportModel };
