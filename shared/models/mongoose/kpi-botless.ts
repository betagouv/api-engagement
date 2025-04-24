import { Schema, model, models } from "mongoose";
import { Kpi } from "../../types/index.d";

const MODELNAME = "kpi-botless";

const schema = new Schema<Kpi>(
  {
    date: { 
      type: Date, 
      required: true, 
      unique: true,
      documentation: {
        description: "Date du KPI (jour) - version sans bots",
      },
    },
    
    // Compteurs de missions disponibles
    availableBenevolatMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de missions de bénévolat disponibles (sans bots)",
      },
    },
    availableVolontariatMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de missions de volontariat disponibles (sans bots)",
      },
    },

    // Compteurs de places données
    availableBenevolatGivenPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de bénévolat données (sans bots)",
      },
    },
    availableVolontariatGivenPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de volontariat données (sans bots)",
      },
    },

    // Compteurs de places attribuées
    availableBenevolatAttributedPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de bénévolat attribuées (sans bots)",
      },
    },
    availableVolontariatAttributedPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de volontariat attribuées (sans bots)",
      },
    },

    // Pourcentages de places données
    percentageBenevolatGivenPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de bénévolat données (sans bots)",
      },
    },
    percentageVolontariatGivenPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de volontariat données (sans bots)",
      },
    },

    // Pourcentages de places attribuées
    percentageBenevolatAttributedPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de bénévolat attribuées (sans bots)",
      },
    },
    percentageVolontariatAttributedPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de volontariat attribuées (sans bots)",
      },
    },

    // Compteurs d'impressions de missions
    benevolatPrintMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre d'impressions de missions de bénévolat (sans bots)",
      },
    },
    volontariatPrintMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre d'impressions de missions de volontariat (sans bots)",
      },
    },

    // Compteurs de clics sur missions
    benevolatClickMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de clics sur des missions de bénévolat (sans bots)",
      },
    },
    volontariatClickMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de clics sur des missions de volontariat (sans bots)",
      },
    },

    // Compteurs de candidatures sur missions
    benevolatApplyMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de candidatures sur des missions de bénévolat (sans bots)",
      },
    },
    volontariatApplyMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de candidatures sur des missions de volontariat (sans bots)",
      },
    },

    // Compteurs de créations de compte pour missions
    benevolatAccountMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de créations de compte pour des missions de bénévolat (sans bots)",
      },
    },
    volontariatAccountMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de créations de compte pour des missions de volontariat (sans bots)",
      },
    },

    // Compteurs d'impressions
    benevolatPrintCount: { 
      type: Number,
      documentation: {
        description: "Nombre total d'impressions de bénévolat (sans bots)",
      },
    },
    volontariatPrintCount: { 
      type: Number,
      documentation: {
        description: "Nombre total d'impressions de volontariat (sans bots)",
      },
    },

    // Compteurs de clics
    benevolatClickCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de clics de bénévolat (sans bots)",
      },
    },
    volontariatClickCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de clics de volontariat (sans bots)",
      },
    },

    // Compteurs de candidatures
    benevolatApplyCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de candidatures de bénévolat (sans bots)",
      },
    },
    volontariatApplyCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de candidatures de volontariat (sans bots)",
      },
    },

    // Compteurs de créations de compte
    benevolatAccountCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de créations de compte pour le bénévolat (sans bots)",
      },
    },
    volontariatAccountCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de créations de compte pour le volontariat (sans bots)",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ date: 1 }, { unique: true });


const KpiBotlessModel = models[MODELNAME] || model<Kpi>(MODELNAME, schema);

export { KpiBotlessModel };
