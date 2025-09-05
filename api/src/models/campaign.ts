import { Schema, model } from "mongoose";

import { Campaign } from "../types";

const MODELNAME = "campaign";

const schema = new Schema<Campaign>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["banniere/publicité", "mailing", "tuile/bouton", "autre"] },
    url: { type: String, trim: true, required: true },
    trackers: { type: [{ key: String, value: String }], default: [] },

    fromPublisherId: { type: String, required: true },
    fromPublisherName: { type: String },

    toPublisherId: { type: String, required: true },
    toPublisherName: { type: String },

    reassignedAt: { type: Date, default: null },
    reassignedByUsername: { type: String, default: null },
    reassignedByUserId: { type: String, default: null },

    active: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ name: 1, fromPublisherId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const CampaingModel = model<Campaign>(MODELNAME, schema);
export default CampaingModel;
