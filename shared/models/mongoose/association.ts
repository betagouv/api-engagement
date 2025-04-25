import { Schema, model, models } from "mongoose";

import { Association } from "../../types";

const MODELNAME = "association";

const schema = new Schema<Association>({
  // Id
  id_siren: { type: String, index: true }, // identique à "identite_id_siren"
  id_rna: { type: String, index: true }, // identique à "identite_id_rna"
  id_correspondance: { type: String, index: true }, // identique à "identite_id_correspondance"

  // General
  logo: { type: String },
  url: { type: String },
  linkedin: { type: String },
  facebook: { type: String },
  twitter: { type: String },
  description: { type: String },

  donation: { type: String }, // URL vers le site de donation
  statut_juridique: { type: String }, // Association, Collectivité, Organisation publique, Organisation privée, Autre
  publics_beneficiaires: { type: [String] }, // Publics visés (ex: "Personnes âgées, Personnes en situation de handicap, Personnes en difficulté, Parents, Jeunes / enfants, Tous publics")
  domaines: { type: [String] },

  parent_nom: { type: String }, // ???
  parent_id: { type: String }, // ???
  tags: { type: [String] }, // Tags: BANQUE ALIMENTAIRE or UNAPEI.

  // Etablissements
  etablissements_nb_actifs: { type: String },
  est_etablissement_secondaire: { type: String },
  etablissements_etablissement: { type: [String] }, // identique à etablissements ???
  etablissements: { type: [String] },

  //identity
  identite_nom: { type: String, index: true },
  identite_sigle: { type: String },
  identite_id_rna: { type: String },
  identite_id_ex: { type: String },
  identite_id_siren: { type: String },
  identite_id_siret_siege: { type: String },
  identite_id_correspondance: { type: String },
  identite_id_forme_juridique: { type: String },
  identite_lib_forme_juridique: { type: String },

  identite_date_pub_jo: { type: Date },
  identite_date_creation_sirene: { type: Date },
  identite_date_modif_rna: { type: Date },
  identite_date_modif_siren: { type: Date },

  identite_active: { type: String },
  identite_nature: { type: String },
  identite_util_publique: { type: String },
  identite_eligibilite_cec: { type: String },
  identite_groupement: { type: String },
  identite_regime: { type: String },
  identite_impots_commerciaux: { type: String },

  // Activity
  activites_objet: { type: String },
  activites_id_objet_social1: { type: String },
  activites_lib_objet_social1: { type: String },
  activites_id_famille1: { type: String },
  activites_lib_famille1: { type: String },
  activites_id_theme1: { type: String },
  activites_lib_theme1: { type: String },
  activites_id_activite_principale: { type: String },
  activites_lib_activite_principale: { type: String },
  activites_annee_activite_principale: { type: String },
  activites_id_tranche_effectif: { type: String },
  activites_lib_tranche_effectif: { type: String },
  activites_effectif_salarie_cent: { type: String },
  activites_annee_effectif_salarie_cent: { type: String },
  activites_appartenance_ess: { type: String },
  activites_date_appartenance_ess: { type: String },

  // Coordonnees
  coordonnees_telephone: { type: [String] },
  coordonnees_courriel: { type: [String] },
  coordonnees_courriel_status: { type: String },

  coordonnees_adresse_location: { lat: { type: Number }, lon: { type: Number } },
  coordonnees_adresse_nom_complet: { type: String },
  coordonnees_adresse_score_api_adresse: { type: String },
  coordonnees_adresse_id_api_adresse: { type: String },
  coordonnees_adresse_nom: { type: String },
  coordonnees_adresse_code_postal: { type: String },
  coordonnees_adresse_code_insee: { type: String },
  coordonnees_adresse_rue: { type: String },
  coordonnees_adresse_numero: { type: String },
  coordonnees_adresse_commune: { type: String },
  coordonnees_adresse_commune_ancienne: { type: String },
  coordonnees_adresse_contexte: { type: String },
  coordonnees_adresse_departement_numero: { type: String },
  coordonnees_adresse_departement: { type: String },
  coordonnees_adresse_region: { type: String },
  coordonnees_adresse_type: { type: String },

  coordonnees_adresse_siege_num_voie: { type: String },
  coordonnees_adresse_siege_code_type_voie: { type: String },
  coordonnees_adresse_siege_type_voie: { type: String },
  coordonnees_adresse_siege_code_type_voie_insee: { type: String },
  coordonnees_adresse_siege_voie: { type: String },
  coordonnees_adresse_siege_cp: { type: String },
  coordonnees_adresse_siege_commune: { type: String },
  coordonnees_adresse_siege_code_insee: { type: String },

  coordonnees_adresse_gestion_voie: { type: String },
  coordonnees_adresse_gestion_cp: { type: String },
  coordonnees_adresse_gestion_commune: { type: String },
  coordonnees_adresse_gestion_pays: { type: String },

  // Time and history and version
  schema_version: { type: String },
  history: { type: [String] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const AssociationModel = models[MODELNAME] || model<Association>(MODELNAME, schema);

export { AssociationModel };