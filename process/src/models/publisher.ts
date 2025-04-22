import { Schema, model } from "mongoose";

import { Publisher } from "../types";

const MODELNAME = "publisher";
const schema = new Schema<Publisher>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      documentation: {
        description: "Full name of the publisher",
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      documentation: {
        description: "Status",
      },
    },

    automated_report: { type: Boolean, default: false },
    send_report_to: {
      type: [String],
      documentation: {
        description: "List of users id to send report to",
      },
    },

    mission_type: {
      type: String,
      default: null,
      enum: ["benevolat", "volontariat", null],
      documentation: {
        description: "Type of mission proposed by the publisher",
      },
    },

    role_promoteur: { type: Boolean, default: false },
    role_annonceur_api: { type: Boolean, default: false },
    role_annonceur_widget: { type: Boolean, default: false },
    role_annonceur_campagne: { type: Boolean, default: false },

    url: {
      type: String,
      documentation: {
        description: "Business website or profile url",
      },
    },

    moderator: {
      type: Boolean,
      default: false,
      documentation: {
        description: "Acces a la platforme de modération",
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
        description: "",
      },
    },

    logo: {
      type: String,
      documentation: {
        description: "publisher logo",
      },
    },

    feed: {
      type: String,
      documentation: {
        description: "Url to the publisher feed",
      },
    },

    apikey: {
      type: String,
      documentation: {
        generated: true,
        description: "apikey token",
      },
    },

    lastSyncAt: {
      type: Date,
      documentation: {
        generated: true,
        description: "When was the last sync",
      },
    },

    publishers: {
      type: [
        {
          publisher: String, // publisherId one day ?
          publisherName: String,
          publisherLogo: String,
          mission_type: String,
          moderator: Boolean,
        },
      ],
      documentation: {
        description: "publishers dont les missions sont accessibles a ce publisher",
      },
    },

    description: {
      type: String,
      default: "",
      documentation: {
        description: "Description",
      },
    },

    lead: {
      type: String,
      default: "",
      documentation: {
        description: "Leader",
      },
    },

    deleted_at: {
      type: Date,
      documentation: {
        generated: true,
        description: "Date of deletion",
      },
      default: null,
    },

    created_at: {
      type: Date,
      default: Date.now,
      documentation: {
        generated: true,
        description: "Date of creation",
      },
    },

    updated_at: {
      type: Date,
      default: Date.now,
      documentation: {
        generated: true,
        description: "Date of last changes",
      },
    },
    lastFetchAt: {
      type: Date,
      documentation: {
        generated: true,
        description: "Date of last fetch",
      },
    },
    acceptedCount: {
      type: Number,
      default: 0,
      documentation: {
        generated: true,
        description: "Date of last fetch",
      },
    },
    refusedCount: {
      type: Number,
      default: 0,
      documentation: {
        generated: true,
        description: "Date of last fetch",
      },
    },
  },
  { timestamps: true },
);

const PublisherModel = model<Publisher>(MODELNAME, schema);
export default PublisherModel;
