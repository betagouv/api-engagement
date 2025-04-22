import { Schema, model } from "mongoose";
import { Diffuseur, Publisher, PublisherExcludedOrganization } from "../../types/index.d";

const MODELNAME = "publisher";

// Schéma pour les diffuseurs (sous-éléments du publisher)
const publisherSchema = new Schema<Diffuseur>(
  {
    publisherId: { 
      type: String, 
      ref: "publisher",
      documentation: {
        description: "ID du publisher",
      },
    },
    publisherName: { 
      type: String, 
      required: true, 
      trim: true,
      documentation: {
        description: "Nom du publisher",
      },
    },
    publisherLogo: { 
      type: String,
      documentation: {
        description: "Logo du publisher",
      },
    },
    moderator: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si le diffuseur est modérateur",
      },
    },
    missionType: { 
      type: String, 
      default: null, 
      enum: ["benevolat", "volontariat", null],
      documentation: {
        description: "Type de mission proposé par le diffuseur",
      },
    },
    // Champs dépréciés (à migrer)
    publisher: { 
      type: String, 
      ref: "publisher",
      documentation: {
        description: "ID du publisher (déprécié)",
      },
    },
    mission_type: { 
      type: String, 
      default: null, 
      enum: ["benevolat", "volontariat", null],
      documentation: {
        description: "Type de mission (déprécié)",
      },
    },
  },
  { timestamps: true },
);

// Schéma pour les organisations exclues
const excludedOrganizationSchema = new Schema<PublisherExcludedOrganization>(
  {
    publisherId: { 
      type: String, 
      ref: "publisher",
      documentation: {
        description: "ID du publisher",
      },
    },
    publisherName: { 
      type: String, 
      required: true, 
      trim: true,
      documentation: {
        description: "Nom du publisher",
      },
    },
    organizationClientId: { 
      type: String,
      documentation: {
        description: "ID client de l'organisation exclue",
      },
    },
    organizationName: { 
      type: String, 
      trim: true,
      documentation: {
        description: "Nom de l'organisation exclue",
      },
    },
  },
  { timestamps: true },
);

// Schéma principal pour le publisher
const schema = new Schema<Publisher>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      documentation: {
        description: "Nom complet du publisher",
      },
    },
    status: { 
      type: String, 
      enum: ["active", "inactive"],
      documentation: {
        description: "Statut du publisher",
      },
    },
    category: { 
      type: String, 
      default: null,
      documentation: {
        description: "Catégorie du publisher",
      },
    },
    automated_report: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si les rapports sont automatisés",
      },
    },
    send_report_to: { 
      type: [String],
      documentation: {
        description: "Liste des ID utilisateurs à qui envoyer les rapports",
      },
    },

    url: { 
      type: String,
      documentation: {
        description: "Site web ou URL du profil",
      },
    },

    moderator: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Accu00e8s à la plateforme de modération",
      },
    },
    moderatorLink: { 
      type: String,
      documentation: {
        description: "Lien de la page de modération",
      },
    },
    email: { 
      type: String,
      documentation: {
        description: "Email du partenaire",
      },
    },

    documentation: { 
      type: String,
      documentation: {
        description: "Documentation du publisher",
      },
    },
    logo: { 
      type: String,
      documentation: {
        description: "Logo du publisher",
      },
    },
    feed: { 
      type: String,
      documentation: {
        description: "URL du flux du publisher",
      },
    },
    apikey: { 
      type: String,
      documentation: {
        generated: true,
        description: "Clé API du publisher",
      },
    },
    lastSyncAt: { 
      type: Date,
      documentation: {
        generated: true,
        description: "Date de la derniu00e8re synchronisation",
      },
    },

    publishers: { 
      type: [publisherSchema],
      documentation: {
        description: "Publishers dont les missions sont accessibles à ce publisher",
      },
    },
    excludedOrganizations: { 
      type: [excludedOrganizationSchema],
      documentation: {
        description: "Organisations exclues par ce publisher",
      },
    },
    description: { 
      type: String, 
      default: "",
      documentation: {
        description: "Description du publisher",
      },
    },
    lead: { 
      type: String, 
      default: "",
      documentation: {
        description: "Responsable du publisher",
      },
    },
    deletedAt: { 
      type: Date, 
      default: null,
      documentation: {
        description: "Date de suppression (nouveau format)",
      },
    },

    // Champs pour les types de missions et ru00f4les (nouveaux noms)
    missionType: { 
      type: String, 
      default: null, 
      enum: ["benevolat", "volontariat", null],
      documentation: {
        description: "Type de mission proposé par le publisher",
      },
    },
    annonceur: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si le publisher est annonceur",
      },
    },
    api: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si le publisher utilise l'API",
      },
    },
    widget: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si le publisher utilise le widget",
      },
    },
    campaign: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Indique si le publisher utilise les campagnes",
      },
    },

    // Champs dépréciés (à migrer)
    mission_type: { 
      type: String, 
      default: null, 
      enum: ["benevolat", "volontariat", null],
      documentation: {
        description: "Type de mission (déprécié)",
      },
    },
    role_promoteur: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Ru00f4le promoteur (déprécié)",
      },
    },
    role_annonceur_api: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Ru00f4le annonceur API (déprécié)",
      },
    },
    role_annonceur_widget: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Ru00f4le annonceur widget (déprécié)",
      },
    },
    role_annonceur_campagne: { 
      type: Boolean, 
      default: false,
      documentation: {
        description: "Ru00f4le annonceur campagne (déprécié)",
      },
    },

    excludeOrganisations: { 
      type: [String],
      documentation: {
        description: "Liste des organisations exclues (format ancien)",
      },
    },
    lastFetchAt: { 
      type: Date,
      documentation: {
        generated: true,
        description: "Date de la derniu00e8re récupération",
      },
    },
    acceptedCount: { 
      type: Number, 
      default: 0,
      documentation: {
        generated: true,
        description: "Nombre de missions acceptées",
      },
    },
    refusedCount: { 
      type: Number, 
      default: 0,
      documentation: {
        generated: true,
        description: "Nombre de missions refusées",
      },
    },
    updated_at: { 
      type: Date, 
      default: Date.now,
      documentation: {
        generated: true,
        description: "Date de derniu00e8re modification (ancien format)",
      },
    },
    created_at: { 
      type: Date, 
      default: Date.now,
      documentation: {
        generated: true,
        description: "Date de création (ancien format)",
      },
    },
    deleted_at: { 
      type: Date, 
      default: null,
      documentation: {
        generated: true,
        description: "Date de suppression (ancien format)",
      },
    },
  },
  { timestamps: true },
);

// Indexes
schema.index({ name: 1 }, { unique: true });
schema.index({ status: 1 });
schema.index({ moderator: 1 });
schema.index({ "publishers.publisherId": 1 });
schema.index({ deleted_at: 1 });
schema.index({ deletedAt: 1 });

const PublisherModel = model<Publisher>(MODELNAME, schema);

export { PublisherModel };
