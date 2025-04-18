import { Schema, model } from "mongoose";

const MODELNAME = "widget";

const schema = new Schema(
  {
    _old_id: { type: String },
    name: { type: String, required: true },
    diffuseur_id: { type: String, required: true },
    mission_type: { type: String, enum: ["benevolat", "volontariat"] },
    active: { type: Boolean, default: true },
    color: { type: String },
    style: { type: String, enum: ["carousel", "page"] },
    city: { type: String },
    postal_code: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    distance: { type: String },
    jva_moderation: { type: Boolean, default: false },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ diffuseur_id: 1 });
schema.index({ mission_type: 1 });
schema.index({ active: 1 });

// Export du modu00e8le
const WidgetModel = model(MODELNAME, schema);
export default WidgetModel;

// Export d'une fonction pour obtenir le modu00e8le
export function getWidgetModel() {
  return WidgetModel;
}
