import { Schema, model } from "mongoose";

const MODELNAME = "organization";

const schema = new Schema(
  {
    _id: { type: String },
    _old_id: { type: String },
    rna: { type: String },
    siren: { type: String },
    siret: { type: String },
    rup_mi: { type: String },
    gestion: { type: String },
    status: { type: String },
    created_at: { type: Date, default: Date.now },
    last_declared_at: { type: Date },
    published_at: { type: Date },
    dissolved_at: { type: Date },
    updated_at: { type: Date },
    nature: { type: String },
    groupement: { type: String },
    title: { type: String },
    short_title: { type: String },
    title_slug: { type: String },
    short_title_slug: { type: String },
    names: { type: [String] },
    object: { type: String },
    social_object1: { type: String },
    social_object2: { type: String },
    address_complement: { type: String },
    address_number: { type: String },
    address_repetition: { type: String },
    address_type: { type: String },
    address_street: { type: String },
    address_distribution: { type: String },
    address_insee_code: { type: String },
    address_postal_code: { type: String },
    address_department_code: { type: String },
    address_department_name: { type: String },
    address_region: { type: String },
    address_city: { type: String },
    management_declarant: { type: String },
    management_complement: { type: String },
    management_street: { type: String },
    management_distribution: { type: String },
    management_postal_code: { type: String },
    management_city: { type: String },
    management_country: { type: String },
    director_civility: { type: String },
    website: { type: String },
    observation: { type: String },
    sync_at: { type: Date },
    source: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ rna: 1 });
schema.index({ siren: 1 });
schema.index({ siret: 1 });
schema.index({ title: 1 });
schema.index({ title_slug: 1 });
schema.index({ short_title_slug: 1 });
schema.index({ names: 1 });

// Export du modèle
const OrganizationModel = model(MODELNAME, schema);
export default OrganizationModel;

// Export d'une fonction pour obtenir le modèle
export function getOrganizationModel() {
  return OrganizationModel;
}
