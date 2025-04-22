import { Schema, model } from "mongoose";
import { ImportRna } from "../../types/index.d";

const MODELNAME = "import-rna";

const schema = new Schema<ImportRna>(
  {
    year: {
      type: Number,
      documentation: {
        description: "Année de l'import RNA",
      },
    },
    month: {
      type: Number,
      documentation: {
        description: "Mois de l'import RNA",
      },
    },
    resourceId: {
      type: String,
      documentation: {
        description: "Identifiant de la ressource",
      },
    },
    resourceCreatedAt: {
      type: Date,
      documentation: {
        description: "Date de création de la ressource",
      },
    },
    resourceUrl: {
      type: String,
      documentation: {
        description: "URL de la ressource",
      },
    },
    count: {
      type: Number,
      default: 0,
      documentation: {
        description: "Nombre d'éléments importés",
      },
    },

    startedAt: {
      type: Date,
      required: true,
      documentation: {
        description: "Date de début de l'import",
      },
    },
    endedAt: {
      type: Date,
      required: true,
      documentation: {
        description: "Date de fin de l'import",
      },
    },
    status: {
      type: String,
      documentation: {
        description: "Statut de l'import",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
schema.index({ year: 1, month: 1 });
schema.index({ resourceId: 1 });
schema.index({ status: 1 });
schema.index({ startedAt: 1 });
schema.index({ endedAt: 1 });


const ImportRnaModel = model<ImportRna>(MODELNAME, schema);

export { ImportRnaModel };
