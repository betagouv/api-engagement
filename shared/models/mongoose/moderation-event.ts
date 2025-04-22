import { Schema, model } from "mongoose";
import { ModerationEvent } from "../../types/index.d";

const MODELNAME = "moderation-event";

const schema = new Schema<ModerationEvent>(
  {
    missionId: { 
      type: String, 
      required: true,
      documentation: {
        description: "ID de la mission modérée",
      },
    },
    moderatorId: { 
      type: String, 
      required: true,
      documentation: {
        description: "ID du modérateur ayant effectué l'action",
      },
    },
    userId: { 
      type: String, 
      default: null,
      documentation: {
        description: "ID de l'utilisateur concerné par la modération",
      },
    },
    userName: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nom de l'utilisateur concerné par la modération",
      },
    },
    initialStatus: { 
      type: String, 
      enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", null], 
      default: null,
      documentation: {
        description: "Statut initial de la mission avant modération",
      },
    },
    newStatus: { 
      type: String, 
      enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", null], 
      default: null,
      documentation: {
        description: "Nouveau statut de la mission apru00e8s modération",
      },
    },
    initialTitle: { 
      type: String, 
      default: null,
      documentation: {
        description: "Titre initial de la mission avant modération",
      },
    },
    newTitle: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nouveau titre de la mission apru00e8s modération",
      },
    },
    initialComment: { 
      type: String, 
      default: null,
      documentation: {
        description: "Commentaire initial avant modération",
      },
    },
    newComment: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nouveau commentaire apru00e8s modération",
      },
    },
    initialNote: { 
      type: String, 
      default: null,
      documentation: {
        description: "Note interne initiale avant modération",
      },
    },
    newNote: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nouvelle note interne apru00e8s modération",
      },
    },
    initialSiren: { 
      type: String, 
      default: null,
      documentation: {
        description: "SIREN initial avant modération",
      },
    },
    newSiren: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nouveau SIREN apru00e8s modération",
      },
    },
    initialRNA: { 
      type: String, 
      default: null,
      documentation: {
        description: "RNA initial avant modération",
      },
    },
    newRNA: { 
      type: String, 
      default: null,
      documentation: {
        description: "Nouveau RNA apru00e8s modération",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ missionId: 1 });
schema.index({ moderatorId: 1 });
schema.index({ userId: 1 });
schema.index({ createdAt: 1 });


const ModerationEventModel = model<ModerationEvent>(MODELNAME, schema);

export { ModerationEventModel };
