import { Schema, model } from "mongoose";
import { Association } from "../../types/index.d";

const MODELNAME = "association";

const schema = new Schema<Association>({
  // Identifiants
  id_siren: { 
    type: String, 
    documentation: {
      description: "Identifiant SIREN de l'association (identique à identite_id_siren)",
    },
  },
  id_rna: { 
    type: String, 
    documentation: {
      description: "Identifiant RNA de l'association (identique à identite_id_rna)",
    },
  },
  id_correspondance: { 
    type: String, 
    documentation: {
      description: "Identifiant de correspondance (identique à identite_id_correspondance)",
    },
  },
  
  // Informations générales
  logo: { 
    type: String,
    documentation: {
      description: "URL du logo de l'association",
    },
  },
  url: { 
    type: String,
    documentation: {
      description: "Site web de l'association",
    },
  },
  linkedin: { 
    type: String,
    documentation: {
      description: "Profil LinkedIn de l'association",
    },
  },
  facebook: { 
    type: String,
    documentation: {
      description: "Page Facebook de l'association",
    },
  },
  twitter: { 
    type: String,
    documentation: {
      description: "Compte Twitter de l'association",
    },
  },
  description: { 
    type: String,
    documentation: {
      description: "Description de l'association",
    },
  },
  
  donation: { 
    type: String,
    documentation: {
      description: "URL vers le site de donation",
    },
  },
  statut_juridique: { 
    type: String,
    documentation: {
      description: "Statut juridique (Association, Collectivité, Organisation publique, Organisation privée, Autre)",
    },
  },
  publics_beneficiaires: { 
    type: [String],
    documentation: {
      description: "Publics visés (ex: Personnes u00e2gées, Personnes en situation de handicap, etc.)",
    },
  },
  domaines: { 
    type: [String],
    documentation: {
      description: "Domaines d'activité de l'association",
    },
  },
  
  parent_nom: { 
    type: String,
    documentation: {
      description: "Nom de l'organisation parente",
    },
  },
  parent_id: { 
    type: String,
    documentation: {
      description: "ID de l'organisation parente",
    },
  },
  tags: { 
    type: [String],
    documentation: {
      description: "Tags associés (ex: BANQUE ALIMENTAIRE, UNAPEI)",
    },
  },
  
  // u00c9tablissements
  etablissements_nb_actifs: { 
    type: String,
    documentation: {
      description: "Nombre d'établissements actifs",
    },
  },
  est_etablissement_secondaire: { 
    type: String,
    documentation: {
      description: "Indique si c'est un établissement secondaire",
    },
  },
  etablissements_etablissement: { 
    type: [String],
    documentation: {
      description: "Liste des établissements (identique à etablissements)",
    },
  },
  etablissements: { 
    type: [String],
    documentation: {
      description: "Liste des établissements",
    },
  },
  
  // Identité
  identite_nom: { 
    type: String, 
    documentation: {
      description: "Nom officiel de l'association",
    },
  },
  identite_sigle: { 
    type: String,
    documentation: {
      description: "Sigle de l'association",
    },
  },
  identite_id_rna: { 
    type: String,
    documentation: {
      description: "Identifiant RNA",
    },
  },
  identite_id_ex: { 
    type: String,
    documentation: {
      description: "Identifiant EX",
    },
  },
  identite_id_siren: { 
    type: String,
    documentation: {
      description: "Identifiant SIREN",
    },
  },
  identite_id_siret_siege: { 
    type: String,
    documentation: {
      description: "Identifiant SIRET du siu00e8ge",
    },
  },
  identite_id_correspondance: { 
    type: String,
    documentation: {
      description: "Identifiant de correspondance",
    },
  },
  identite_id_forme_juridique: { 
    type: String,
    documentation: {
      description: "Identifiant de la forme juridique",
    },
  },
  identite_lib_forme_juridique: { 
    type: String,
    documentation: {
      description: "Libellé de la forme juridique",
    },
  },
  
  identite_date_pub_jo: { 
    type: Date,
    documentation: {
      description: "Date de publication au Journal Officiel",
    },
  },
  identite_date_creation_sirene: { 
    type: Date,
    documentation: {
      description: "Date de création dans SIRENE",
    },
  },
  identite_date_modif_rna: { 
    type: Date,
    documentation: {
      description: "Date de dernière modification dans le RNA",
    },
  },
  identite_date_modif_siren: { 
    type: Date,
    documentation: {
      description: "Date de dernière modification dans SIRENE",
    },
  },
  
  identite_active: { 
    type: String,
    documentation: {
      description: "Indique si l'association est active",
    },
  },
  identite_nature: { 
    type: String,
    documentation: {
      description: "Nature de l'association",
    },
  },
  identite_util_publique: { 
    type: String,
    documentation: {
      description: "Indique si l'association est reconnue d'utilité publique",
    },
  },
  identite_eligibilite_cec: { 
    type: String,
    documentation: {
      description: "u00c9ligibilité au Compte d'Engagement Citoyen",
    },
  },
  identite_groupement: { 
    type: String,
    documentation: {
      description: "Indique si l'association fait partie d'un groupement",
    },
  },
  identite_regime: { 
    type: String,
    documentation: {
      description: "Régime de l'association",
    },
  },
  identite_impots_commerciaux: { 
    type: String,
    documentation: {
      description: "Assujettissement aux impu00f4ts commerciaux",
    },
  },
  
  // Activités
  activites_objet: { 
    type: String,
    documentation: {
      description: "Objet social de l'association",
    },
  },
  activites_id_objet_social1: { 
    type: String,
    documentation: {
      description: "Identifiant de l'objet social principal",
    },
  },
  activites_lib_objet_social1: { 
    type: String,
    documentation: {
      description: "Libellé de l'objet social principal",
    },
  },
  activites_id_famille1: { 
    type: String,
    documentation: {
      description: "Identifiant de la famille d'activité principale",
    },
  },
  activites_lib_famille1: { 
    type: String,
    documentation: {
      description: "Libellé de la famille d'activité principale",
    },
  },
  activites_id_theme1: { 
    type: String,
    documentation: {
      description: "Identifiant du thu00e8me principal",
    },
  },
  activites_lib_theme1: { 
    type: String,
    documentation: {
      description: "Libellé du thu00e8me principal",
    },
  },
  activites_id_activite_principale: { 
    type: String,
    documentation: {
      description: "Code APE/NAF de l'activité principale",
    },
  },
  activites_lib_activite_principale: { 
    type: String,
    documentation: {
      description: "Libellé de l'activité principale",
    },
  },
  activites_annee_activite_principale: { 
    type: String,
    documentation: {
      description: "Année de définition de l'activité principale",
    },
  },
  activites_id_tranche_effectif: { 
    type: String,
    documentation: {
      description: "Code de la tranche d'effectif",
    },
  },
  activites_lib_tranche_effectif: { 
    type: String,
    documentation: {
      description: "Libellé de la tranche d'effectif",
    },
  },
  activites_effectif_salarie_cent: { 
    type: String,
    documentation: {
      description: "Effectif salarié centenaire",
    },
  },
  activites_annee_effectif_salarie_cent: { 
    type: String,
    documentation: {
      description: "Année de l'effectif salarié centenaire",
    },
  },
  activites_appartenance_ess: { 
    type: String,
    documentation: {
      description: "Appartenance à l'u00c9conomie Sociale et Solidaire",
    },
  },
  activites_date_appartenance_ess: { 
    type: String,
    documentation: {
      description: "Date d'appartenance à l'ESS",
    },
  },
  
  // Coordonnées
  coordonnees_telephone: { 
    type: [String],
    documentation: {
      description: "Numéros de téléphone",
    },
  },
  coordonnees_courriel: { 
    type: [String],
    documentation: {
      description: "Adresses email",
    },
  },
  coordonnees_courriel_status: { 
    type: String,
    documentation: {
      description: "Statut de l'adresse email principale",
    },
  },
  
  coordonnees_adresse_location: { 
    type: { lat: { type: Number }, lon: { type: Number } },
    documentation: {
      description: "Coordonnées géographiques de l'adresse",
    },
  },
  coordonnees_adresse_nom_complet: { 
    type: String,
    documentation: {
      description: "Adresse compu00e8te",
    },
  },
  coordonnees_adresse_score_api_adresse: { 
    type: String,
    documentation: {
      description: "Score de l'API Adresse",
    },
  },
  coordonnees_adresse_id_api_adresse: { 
    type: String,
    documentation: {
      description: "Identifiant de l'API Adresse",
    },
  },
  coordonnees_adresse_nom: { 
    type: String,
    documentation: {
      description: "Nom de l'adresse",
    },
  },
  coordonnees_adresse_code_postal: { 
    type: String,
    documentation: {
      description: "Code postal",
    },
  },
  coordonnees_adresse_code_insee: { 
    type: String,
    documentation: {
      description: "Code INSEE de la commune",
    },
  },
  coordonnees_adresse_rue: { 
    type: String,
    documentation: {
      description: "Nom de la rue",
    },
  },
  coordonnees_adresse_numero: { 
    type: String,
    documentation: {
      description: "Numéro dans la rue",
    },
  },
  coordonnees_adresse_commune: { 
    type: String,
    documentation: {
      description: "Nom de la commune",
    },
  },
  coordonnees_adresse_commune_ancienne: { 
    type: String,
    documentation: {
      description: "Nom de l'ancienne commune (en cas de fusion)",
    },
  },
  coordonnees_adresse_contexte: { 
    type: String,
    documentation: {
      description: "Contexte de l'adresse",
    },
  },
  coordonnees_adresse_departement_numero: { 
    type: String,
    documentation: {
      description: "Numéro du département",
    },
  },
  coordonnees_adresse_departement: { 
    type: String,
    documentation: {
      description: "Nom du département",
    },
  },
  coordonnees_adresse_region: { 
    type: String,
    documentation: {
      description: "Nom de la région",
    },
  },
  coordonnees_adresse_type: { 
    type: String,
    documentation: {
      description: "Type d'adresse",
    },
  },
  
  coordonnees_adresse_siege_num_voie: { 
    type: String,
    documentation: {
      description: "Numéro de voie du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_code_type_voie: { 
    type: String,
    documentation: {
      description: "Code du type de voie du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_type_voie: { 
    type: String,
    documentation: {
      description: "Type de voie du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_code_type_voie_insee: { 
    type: String,
    documentation: {
      description: "Code INSEE du type de voie du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_voie: { 
    type: String,
    documentation: {
      description: "Nom de la voie du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_cp: { 
    type: String,
    documentation: {
      description: "Code postal du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_commune: { 
    type: String,
    documentation: {
      description: "Commune du siu00e8ge",
    },
  },
  coordonnees_adresse_siege_code_insee: { 
    type: String,
    documentation: {
      description: "Code INSEE de la commune du siu00e8ge",
    },
  },
  
  coordonnees_adresse_gestion_voie: { 
    type: String,
    documentation: {
      description: "Voie de l'adresse de gestion",
    },
  },
  coordonnees_adresse_gestion_cp: { 
    type: String,
    documentation: {
      description: "Code postal de l'adresse de gestion",
    },
  },
  coordonnees_adresse_gestion_commune: { 
    type: String,
    documentation: {
      description: "Commune de l'adresse de gestion",
    },
  },
  coordonnees_adresse_gestion_pays: { 
    type: String,
    documentation: {
      description: "Pays de l'adresse de gestion",
    },
  },
  
  // Métadonnées
  schema_version: { 
    type: String,
    documentation: {
      description: "Version du schéma de données",
    },
  },
  history: { 
    type: [String],
    documentation: {
      description: "Historique des modifications",
    },
  },
  created_at: { 
    type: Date, 
    default: Date.now,
    documentation: {
      description: "Date de création de l'enregistrement",
    },
  },
  updated_at: { 
    type: Date, 
    default: Date.now,
    documentation: {
      description: "Date de dernière mise à jour de l'enregistrement",
    },
  },
});

// Indexes
schema.index({ id_siren: 1 });
schema.index({ id_rna: 1 });
schema.index({ id_correspondance: 1 });
schema.index({ identite_nom: 1 });
schema.index({ "coordonnees_adresse_location.lat": 1, "coordonnees_adresse_location.lon": 1 });
schema.index({ coordonnees_adresse_code_postal: 1 });
schema.index({ coordonnees_adresse_departement_numero: 1 });
schema.index({ created_at: 1 });
schema.index({ updated_at: 1 });


const AssociationModel = model<Association>(MODELNAME, schema);

export { AssociationModel };