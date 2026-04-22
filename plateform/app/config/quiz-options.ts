import type { StepOption } from "~/types/quiz";

// Catalogue global des options de réponse, indexé par `taxonomyKey`.
// Chaque entrée embarque sa propre `taxonomyKey` (seal via `def`) — les step components
// composent leurs listes via `OPTIONS["namespace.key"]`, et peuvent surcharger localement
// (ex: `hiddenIf`) avec un spread `{ ...OPTIONS["..."], hiddenIf: ... }`.
//
// Drifts résolus au profit du libellé majoritaire :
// - `motivation.ne_sais_pas` : "Je ne sais pas encore" (3/4 steps) — au lieu de "Je ne sais pas" (motivation-actif).
// - `motivation.decouvrir_domaine` : sublabel "Pour me ré-orienter, avoir une expérience pour tester…" (3/4) — au lieu de la variante motivation-actif.
//
// Le catalogue sera a generer a l'aide d'un script du back pour etre sur de avoir toutes les options a jour.

type OptionEntry = Omit<StepOption, "taxonomyKey">;

const def = <K extends string>(entries: Record<K, OptionEntry>): Record<K, StepOption> =>
  Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { ...(v as OptionEntry), taxonomyKey: k }])) as Record<K, StepOption>;

export const OPTIONS = def({
  // --- statut ---
  "statut.lyceen": { label: "Lycéen" },
  "statut.etudiant": { label: "Étudiant" },
  "statut.demandeur_emploi": { label: "Demandeur d'emploi" },
  "statut.actif": { label: "En activité" },
  "statut.retraite": { label: "Retraité" },
  "statut.autre": { label: "Autre" },

  // --- handicap ---
  "handicap.oui": { label: "Oui" },
  "handicap.non": { label: "Non" },
  "handicap.ne_se_prononce_pas": { label: "Je préfère ne pas répondre" },

  // --- duree ---
  "duree.ponctuelle": { label: "Mission ponctuelle" },
  "duree.reguliere": { label: "Mission régulière" },
  "duree.temps_plein": { label: "Mission à temps plein" },
  "duree.ne_sais_pas": { label: "Je ne sais pas encore" },

  // --- motivation (partagé par les 5 steps motivation_*) ---
  "motivation.me_sentir_utile": { label: "Me sentir utile, rencontrer de nouvelles personnes" },
  "motivation.booster_parcoursup": { label: "Booster mon dossier Parcoursup" },
  "motivation.tester_orientation": { label: "Tester une orientation" },
  "motivation.servir_le_pays": { label: "Servir le pays" },
  "motivation.ne_sais_pas": { label: "Je ne sais pas encore" },
  "motivation.booster_cv": { label: "Booster mon CV", sublabel: "Acquérir des compétences en rapport avec mes études" },
  "motivation.decouvrir_domaine": {
    label: "Découvrir un nouveau domaine",
    sublabel: "Pour me ré-orienter, avoir une expérience pour tester…",
  },
  "motivation.experience_terrain": { label: "Avoir une 1ère expérience terrain" },
  "motivation.partir_etranger": { label: "Partir à l'étranger" },
  "motivation.competences_interet_general": { label: "Utiliser mes compétences pour l'intérêt général" },
  "motivation.faire_vivre_valeurs": { label: "Faire vivre mes valeurs" },
  "motivation.reprendre_confiance": { label: "Reprendre confiance en moi" },
  "motivation.reprendre_activite": { label: "Garder / reprendre une activité" },
  "motivation.enrichir_cv": { label: "Enrichir mon CV", sublabel: "Acquérir des compétences en rapport avec mon métier" },
  "motivation.preparer_reconversion": {
    label: "Préparer une reconversion professionnelle",
    sublabel: "Tester un nouveau domaine / métier",
  },

  // --- engagement_intent (précisions me_sentir_utile) ---
  "engagement_intent.aide_directe": { label: "🤝 Aide directe aux personnes" },
  "engagement_intent.transmission": { label: "🎓 Transmission / pédagogie / accompagnement de public" },
  "engagement_intent.animation": { label: "🎉 Animation d'actions ou de collectif" },
  "engagement_intent.action_terrain": { label: "🌱 Action terrain concrète", sublabel: "Collecte, distribution, fabrication…" },
  "engagement_intent.secours": { label: "🚒 Secours / intervention" },
  "engagement_intent.cadre_engage": { label: "🪖 Engagement en cadre structuré" },
  "engagement_intent.support_organisation": { label: "🧠 Organisation / gestion de projet / communication" },
  "engagement_intent.exploration": { label: "🤷 Je ne sais pas" },

  // --- parcoursup_formation (booster_parcoursup — formation en tête ?) ---
  "parcoursup_formation.oui": { label: "Oui" },
  "parcoursup_formation.non": { label: "Non" },

  // --- domain (parcoursup_domaine / decouvrir_domaine / indecision) ---
  "domain.social_solidarite": {
    label: "Social et solidarité",
    sublabel: "Aide aux personnes en difficulté, distribution alimentaire, accompagnement",
  },
  "domain.education_transmission": {
    label: "Éducation et transmission",
    sublabel: "Enseignement, animation, aide aux devoirs, citoyenneté",
  },
  "domain.gestion_projet": {
    label: "Gestion de projet",
    sublabel: "Partenariat, communication, responsabilités, tâches administratives",
  },
  "domain.culture_arts": {
    label: "Culture et arts",
    sublabel: "Médiation culturelle, événements artistiques, valorisation du patrimoine",
  },
  "domain.environnement_nature": {
    label: "Environnement et nature",
    sublabel: "Protection de la biodiversité, actions écologiques",
  },
  "domain.sport_animation": {
    label: "Sport et animation sportive",
    sublabel: "Encadrement d'activités, organisation d'événements, promotion du sport",
  },
  "domain.sante_soins": {
    label: "Santé et soins",
    sublabel: "Accompagnement des patients, prévention santé, aide aux personnes dépendantes",
  },
  "domain.securite_defense": {
    label: "Sécurité et défense",
    sublabel: "Protection des populations, secours en personnes",
  },
  "domain.autre": { label: "Autre" },

  // --- orientation (lyceen / tester_orientation — ONISEP) ---
  "orientation.environnement_sciences": { label: "🌱 Environnement, nature et sciences" },
  "orientation.numerique_communication": { label: "💻 Numérique et communication" },
  "orientation.commerce_gestion": { label: "💼 Commerce, gestion, finance et services" },
  "orientation.societe_droit": { label: "⚖️ Société, droit et politique" },
  "orientation.education_culture": { label: "🧑‍🏫 Éducation, culture et création" },
  "orientation.social_sante_sport": { label: "🌍 Social, santé et sport" },
  "orientation.technique_industrie": { label: "🛠️ Technique, industrie et construction" },
  "orientation.securite_logistique": { label: "🚓 Sécurité, défense et logistique" },
  "orientation.ne_sais_pas": { label: "Je ne sais pas encore" },

  // --- competences (booster_cv / enrichir_cv — ROME compétences aspirées) ---
  "competences.management_social_soin": {
    label: "Management, social, soin",
    sublabel: "Aider, accompagner ou prendre soin des autres",
  },
  "competences.communication_creation": {
    label: "Communication, création, innovation, nouvelles technologies",
    sublabel: "Communiquer, créer ou travailler avec le numérique",
  },
  "competences.production_construction": {
    label: "Production, construction, qualité, logistique",
    sublabel: "Fabriquer, concevoir, construire ou travailler avec des outils et des machines",
  },
  "competences.gestion_pilotage": {
    label: "Gestion, pilotage, juridique",
    sublabel: "Gérer une activité, un projet ou des ressources",
  },
  "competences.relation_client": {
    label: "Relation client, commerce, stratégie",
    sublabel: "Développer une activité économique ou commerciale",
  },
  "competences.cooperation_organisation": {
    label: "Coopération, organisation, soft skills",
    sublabel: "Travailler en équipe et développer ses compétences personnelles",
  },
  "competences.protection": {
    label: "Protection des personnes, de la société ou de l'environnement",
    sublabel: "Sécurité, environnement, action publique",
  },

  // --- competences_actuelles (actif / competences_interet_general — ROME compétences détenues) ---
  "competences_actuelles.management_social_soin": {
    label: "Management, social, soin",
    sublabel: "Aider, accompagner ou prendre soin des autres",
  },
  "competences_actuelles.communication_creation": {
    label: "Communication, création, innovation, nouvelles technologies",
    sublabel: "Communiquer, créer ou travailler avec le numérique",
  },
  "competences_actuelles.production_construction": {
    label: "Production, construction, qualité, logistique",
    sublabel: "Fabriquer, concevoir, construire ou travailler avec des outils et des machines",
  },
  "competences_actuelles.gestion_pilotage": {
    label: "Gestion, pilotage, juridique",
    sublabel: "Gérer une activité, un projet ou des ressources",
  },
  "competences_actuelles.relation_client": {
    label: "Relation client, commerce, stratégie",
    sublabel: "Développer une activité économique ou commerciale",
  },
  "competences_actuelles.cooperation_organisation": {
    label: "Coopération, organisation, soft skills",
    sublabel: "Travailler en équipe et développer ses compétences personnelles",
  },
  "competences_actuelles.protection": {
    label: "Protection des personnes, de la société ou de l'environnement",
    sublabel: "Sécurité, environnement, action publique",
  },

  // --- etudes (etudiant / experience_terrain — ONISEP domaine d'études actuel) ---
  "etudes.environnement_sciences": { label: "🌱 Environnement, nature et sciences" },
  "etudes.numerique_communication": { label: "💻 Numérique et communication" },
  "etudes.commerce_gestion": { label: "💼 Commerce, gestion, finance et services" },
  "etudes.societe_droit": { label: "⚖️ Société, droit et politique" },
  "etudes.education_culture": { label: "🧑‍🏫 Éducation, culture et création" },
  "etudes.social_sante_sport": { label: "🌍 Social, santé et sport" },
  "etudes.technique_industrie": { label: "🛠️ Technique, industrie et construction" },
  "etudes.securite_logistique": { label: "🚓 Sécurité, défense et logistique" },
  "etudes.ne_sais_pas": { label: "Je ne sais pas encore" },

  // --- secteurs (demandeur / reprendre_activite — ROME secteurs d'activité) ---
  "secteurs.sante_social_aide": { label: "Santé, social et aide à la personne" },
  "secteurs.education_formation_animation": { label: "Éducation, formation et animation" },
  "secteurs.securite_service_public": { label: "Sécurité et service public" },
  "secteurs.environnement_agriculture": { label: "Environnement et agriculture" },
  "secteurs.culture_creation_medias": { label: "Culture, création et médias" },
  "secteurs.numerique_communication": { label: "Numérique et communication" },
  "secteurs.batiment_industrie_logistique": { label: "Bâtiment, industrie et logistique" },
  "secteurs.gestion_commerce_organisation": { label: "Gestion, commerce et organisation" },
  "secteurs.ne_sais_pas": { label: "Je ne sais pas encore" },

  // --- reconversion (demandeur / preparer_reconversion — ONISEP domaine visé) ---
  "reconversion.environnement_sciences": { label: "🌱 Environnement, nature et sciences" },
  "reconversion.numerique_communication": { label: "💻 Numérique et communication" },
  "reconversion.commerce_gestion": { label: "💼 Commerce, gestion, finance et services" },
  "reconversion.societe_droit": { label: "⚖️ Société, droit et politique" },
  "reconversion.education_culture": { label: "🧑‍🏫 Éducation, culture et création" },
  "reconversion.social_sante_sport": { label: "🌍 Social, santé et sport" },
  "reconversion.technique_industrie": { label: "🛠️ Technique, industrie et construction" },
  "reconversion.securite_logistique": { label: "🚓 Sécurité, défense et logistique" },
  "reconversion.ne_sais_pas": { label: "Je ne sais pas encore" },

  // --- servir_pays (précisions servir_le_pays) ---
  "servir_pays.armee": { label: "Armée", sublabel: "Marine, Air, Santé…" },
  "servir_pays.pompiers": { label: "Pompiers" },
  "servir_pays.gendarmerie": { label: "Gendarmerie" },
  "servir_pays.police": { label: "Police" },
  "servir_pays.ne_sais_pas": { label: "Je ne sais pas" },
  "servir_pays.aucun": { label: "Aucun de ces choix" },

  // --- international (précisions partir_etranger) ---
  "international.europe": { label: "Europe" },
  "international.afrique": { label: "Afrique" },
  "international.amerique": { label: "Amérique" },
  "international.asie": { label: "Asie" },
  "international.ne_sais_pas": { label: "Je ne sais pas encore" },
});

export type TaxonomyKey = keyof typeof OPTIONS;
