import { Schema, model, models } from "mongoose";
import { Import } from "../../types/index.d";

const MODELNAME = "import";

const schema = new Schema<Import>({
  name: {
    type: String,
    required: true,
    documentation: {
      description: "Nom de l'import",
    },
  },
  publisherId: {
    type: String,
    documentation: {
      description: "ID du publisher associé à l'import",
    },
  },
  
  // Compteurs
  missionCount: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre total de missions dans l'import",
    },
  },
  refusedCount: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre de missions refusées",
    },
  },
  createdCount: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre de missions créées",
    },
  },
  deletedCount: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre de missions supprimées",
    },
  },
  updatedCount: {
    type: Number,
    default: 0,
    documentation: {
      description: "Nombre de missions mises à jour",
    },
  },
  
  // Dates
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
  
  // Statut et erreurs
  status: {
    type: String,
    documentation: {
      description: "Statut de l'import",
    },
  },
  failed: {
    type: Object,
    default: [],
    documentation: {
      description: "Liste des échecs lors de l'import",
    },
  },
});

// Indexes
schema.index({ publisherId: 1 });
schema.index({ startedAt: 1 });
schema.index({ status: 1 });


const ImportModel = models[MODELNAME] || model<Import>(MODELNAME, schema);

export { ImportModel };
