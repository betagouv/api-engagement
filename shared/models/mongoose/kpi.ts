import { Schema, model } from "mongoose";
import { Kpi } from "../../types/index.d";

const MODELNAME = "kpi";

const schema = new Schema<Kpi>(
  {
    date: { 
      type: Date, 
      required: true, 
      unique: true,
      documentation: {
        description: "Date du KPI (jour)",
      },
    },
    
    // Compteurs de missions disponibles
    availableBenevolatMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de missions de bénévolat disponibles",
      },
    },
    availableVolontariatMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de missions de volontariat disponibles",
      },
    },

    // Compteurs de places données
    availableBenevolatGivenPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de bénévolat données",
      },
    },
    availableVolontariatGivenPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de volontariat données",
      },
    },

    // Compteurs de places attribuées
    availableBenevolatAttributedPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de bénévolat attribuées",
      },
    },
    availableVolontariatAttributedPlaceCount: { 
      type: Number,
      documentation: {
        description: "Nombre de places de volontariat attribuées",
      },
    },

    // Pourcentages de places données
    percentageBenevolatGivenPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de bénévolat données",
      },
    },
    percentageVolontariatGivenPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de volontariat données",
      },
    },

    // Pourcentages de places attribuées
    percentageBenevolatAttributedPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de bénévolat attribuées",
      },
    },
    percentageVolontariatAttributedPlaces: { 
      type: Number,
      documentation: {
        description: "Pourcentage de places de volontariat attribuées",
      },
    },

    // Compteurs d'impressions de missions
    benevolatPrintMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre d'impressions de missions de bénévolat",
      },
    },
    volontariatPrintMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre d'impressions de missions de volontariat",
      },
    },

    // Compteurs de clics sur missions
    benevolatClickMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de clics sur des missions de bénévolat",
      },
    },
    volontariatClickMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de clics sur des missions de volontariat",
      },
    },

    // Compteurs de candidatures sur missions
    benevolatApplyMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de candidatures sur des missions de bénévolat",
      },
    },
    volontariatApplyMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de candidatures sur des missions de volontariat",
      },
    },

    // Compteurs de créations de compte pour missions
    benevolatAccountMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de créations de compte pour des missions de bénévolat",
      },
    },
    volontariatAccountMissionCount: { 
      type: Number,
      documentation: {
        description: "Nombre de créations de compte pour des missions de volontariat",
      },
    },

    // Compteurs d'impressions
    benevolatPrintCount: { 
      type: Number,
      documentation: {
        description: "Nombre total d'impressions de bénévolat",
      },
    },
    volontariatPrintCount: { 
      type: Number,
      documentation: {
        description: "Nombre total d'impressions de volontariat",
      },
    },

    // Compteurs de clics
    benevolatClickCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de clics de bénévolat",
      },
    },
    volontariatClickCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de clics de volontariat",
      },
    },

    // Compteurs de candidatures
    benevolatApplyCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de candidatures de bénévolat",
      },
    },
    volontariatApplyCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de candidatures de volontariat",
      },
    },

    // Compteurs de créations de compte
    benevolatAccountCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de créations de compte pour le bénévolat",
      },
    },
    volontariatAccountCount: { 
      type: Number,
      documentation: {
        description: "Nombre total de créations de compte pour le volontariat",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ date: 1 }, { unique: true });


const KpiModel = model<Kpi>(MODELNAME, schema);

export { KpiModel };
