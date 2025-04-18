import { Schema, model } from "mongoose";

const MODELNAME = "campaign";

const schema = new Schema(
  {
    _old_id: { type: String },
    url: { type: String },
    name: { type: String },
    diffuseur_id: { type: String, required: true },
    annonceur_id: { type: String, required: true },
    active: { type: Boolean, default: true },
    deleted_at: { type: Date },
    reassigned_at: { type: Date },
    reassigned_by_user_id: { type: String },
    reassigned_by_user_name: { type: String },
    type: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ diffuseur_id: 1 });
schema.index({ annonceur_id: 1 });
schema.index({ active: 1 });

// Export du modèle
const CampaignModel = model(MODELNAME, schema);
export default CampaignModel;

// Export d'une fonction pour obtenir le modèle
export function getCampaignModel() {
  return CampaignModel;
}
