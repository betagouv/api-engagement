/**
 * Interface représentant une association
 */
export interface Association {
  _id?: string;
  
  // Identifiants
  id_siren?: string;
  id_rna?: string;
  id_correspondance?: string;
  
  // Informations générales
  logo?: string;
  url?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  description?: string;
  
  donation?: string; // URL vers le site de donation
  statut_juridique?: string; // Association, Collectivité, Organisation publique, Organisation privée, Autre
  publics_beneficiaires?: string[]; // Publics visés
  domaines?: string[];
  
  parent_nom?: string;
  parent_id?: string;
  tags?: string[];
  
  // u00c9tablissements
  etablissements_nb_actifs?: string;
  est_etablissement_secondaire?: string;
  etablissements_etablissement?: string[];
  etablissements?: string[];
  
  // Identité
  identite_nom?: string;
  identite_sigle?: string;
  identite_id_rna?: string;
  identite_id_ex?: string;
  identite_id_siren?: string;
  identite_id_siret_siege?: string;
  identite_id_correspondance?: string;
  identite_id_forme_juridique?: string;
  identite_lib_forme_juridique?: string;
  
  identite_date_pub_jo?: Date;
  identite_date_creation_sirene?: Date;
  identite_date_modif_rna?: Date;
  identite_date_modif_siren?: Date;
  
  identite_active?: string;
  identite_nature?: string;
  identite_util_publique?: string;
  identite_eligibilite_cec?: string;
  identite_groupement?: string;
  identite_regime?: string;
  identite_impots_commerciaux?: string;
  
  // Activités
  activites_objet?: string;
  activites_id_objet_social1?: string;
  activites_lib_objet_social1?: string;
  activites_id_famille1?: string;
  activites_lib_famille1?: string;
  activites_id_theme1?: string;
  activites_lib_theme1?: string;
  activites_id_activite_principale?: string;
  activites_lib_activite_principale?: string;
  activites_annee_activite_principale?: string;
  activites_id_tranche_effectif?: string;
  activites_lib_tranche_effectif?: string;
  activites_effectif_salarie_cent?: string;
  activites_annee_effectif_salarie_cent?: string;
  activites_appartenance_ess?: string;
  activites_date_appartenance_ess?: string;
  
  // Coordonnées
  coordonnees_telephone?: string[];
  coordonnees_courriel?: string[];
  coordonnees_courriel_status?: string;
  
  coordonnees_adresse_location?: { lat?: number; lon?: number };
  coordonnees_adresse_nom_complet?: string;
  coordonnees_adresse_score_api_adresse?: string;
  coordonnees_adresse_id_api_adresse?: string;
  coordonnees_adresse_nom?: string;
  coordonnees_adresse_code_postal?: string;
  coordonnees_adresse_code_insee?: string;
  coordonnees_adresse_rue?: string;
  coordonnees_adresse_numero?: string;
  coordonnees_adresse_commune?: string;
  coordonnees_adresse_commune_ancienne?: string;
  coordonnees_adresse_contexte?: string;
  coordonnees_adresse_departement_numero?: string;
  coordonnees_adresse_departement?: string;
  coordonnees_adresse_region?: string;
  coordonnees_adresse_type?: string;
  
  coordonnees_adresse_siege_num_voie?: string;
  coordonnees_adresse_siege_code_type_voie?: string;
  coordonnees_adresse_siege_type_voie?: string;
  coordonnees_adresse_siege_code_type_voie_insee?: string;
  coordonnees_adresse_siege_voie?: string;
  coordonnees_adresse_siege_cp?: string;
  coordonnees_adresse_siege_commune?: string;
  coordonnees_adresse_siege_code_insee?: string;
  
  coordonnees_adresse_gestion_voie?: string;
  coordonnees_adresse_gestion_cp?: string;
  coordonnees_adresse_gestion_commune?: string;
  coordonnees_adresse_gestion_pays?: string;
  
  // Métadonnées
  schema_version?: string;
  history?: string[];
  created_at?: Date;
  updated_at?: Date;
}
