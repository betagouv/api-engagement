import { Schema, model, models } from "mongoose";

import { Campaign } from "../types";

const MODELNAME = "campaign";

const schema = new Schema<Campaign>({
  name: { type: String, required: true },
  type: { type: String, enum: ["banniere/publicité", "mailing", "tuile/bouton", "autre"] },
  url: { type: String, trim: true, required: true },
  trackers: { type: [{ key: String, value: String }], default: [] },

  fromPublisherId: { type: String, required: true },
  fromPublisherName: { type: String },

  toPublisherId: { type: String, required: true },
  toPublisherName: { type: String },

  active: {
    type: Boolean,
    required: true,
    default: true,
    documentation: {
      generated: true,
      description: "Boolean that says if the widget is still active or not",
    },
  },

  deletedAt: {
    type: Date,
    default: null,
    documentation: {
      generated: true,
      description: "Date of deletion of the campaign",
    },
  },

  reassignedAt: {
    type: Date,
    default: null,
    documentation: {
      generated: true,
      description: "Date of reassignment of the campaign",
    },
  },

  reassignedByUsername: {
    type: String,
    default: null,
    documentation: {
      generated: true,
      description: "Username of the user who reassigned the campaign",
    },
  },

  reassignedByUserId: {
    type: String,
    default: null,
    documentation: {
      generated: true,
      description: "UserId of the user who reassigned the campaign",
    },
  },

  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    documentation: {
      generated: true,
      description: "Date of creation of the campaign",
    },
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
    documentation: {
      generated: true,
      description: "Date of last update of the campaign",
    },
  },
});

schema.index({ name: 1, fromPublisherId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const CampaingModel = models[MODELNAME] || model<Campaign>(MODELNAME, schema);
export default CampaingModel;
