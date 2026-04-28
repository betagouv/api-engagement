// Source unique de vérité pour les taxonomies et valeurs de taxonomie.
// Basé sur api/scripts/seed-taxonomy.ts.
//
// Champs par taxonomy :
//   label     — libellé affiché en UI / logs
//   type      — "multi_value" | "categorical" | "gate" (correspond au TaxonomyType Prisma)
//   enrichable — true si la taxonomy est classifiée par le LLM (mission-enrichment)
//   gate       — true si la taxonomy est un filtre dur dans le matching engine
//
// Champs par valeur :
//   label      — libellé affiché
//   icon       — emoji optionnel
//   enrichable — false pour les valeurs exclues de l'enrichissement (ex : je_ne_sais_pas)

export const TAXONOMY = {
  // ─── Taxonomies enrichissables ────────────────────────────────────────────

  domaine: {
    label: "Domaine",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      sante_soins: { label: "Santé et soins", icon: null, enrichable: true },
      social_solidarite: { label: "Social et solidarité", icon: null, enrichable: true },
      environnement_nature: { label: "Environnement et nature", icon: null, enrichable: true },
      sport_animation: { label: "Sport et animation sportive", icon: null, enrichable: true },
      culture_arts: { label: "Culture et arts", icon: null, enrichable: true },
      education_transmission: { label: "Éducation et transmission", icon: null, enrichable: true },
      securite_defense: { label: "Sécurité et défense", icon: null, enrichable: true },
      international_humanitaire: { label: "International et humanitaire", icon: null, enrichable: true },
      gestion_projet: { label: "Gestion de projet", icon: null, enrichable: true },
      je_ne_sais_pas: { label: "Je ne sais pas encore", icon: null, enrichable: false },
    },
  },

  secteur_activite: {
    label: "Secteur d'activité (référentiel ROME)",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      sante_social_aide_personne: { label: "Santé, social et aide à la personne", icon: null, enrichable: true },
      education_formation_animation: { label: "Éducation, formation et animation", icon: null, enrichable: true },
      securite_service_public: { label: "Sécurité et service public", icon: null, enrichable: true },
      environnement_agriculture: { label: "Environnement et agriculture", icon: null, enrichable: true },
      culture_creation_medias: { label: "Culture, création et médias", icon: null, enrichable: true },
      numerique_communication: { label: "Numérique et communication", icon: null, enrichable: true },
      batiment_industrie_logistique: { label: "Bâtiment, industrie et logistique", icon: null, enrichable: true },
      gestion_commerce_organisation: { label: "Gestion, commerce et organisation", icon: null, enrichable: true },
      je_ne_sais_pas: { label: "Je ne sais pas encore", icon: null, enrichable: false },
    },
  },

  type_mission: {
    label: "Type / durée de mission",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      ponctuelle: { label: "Mission ponctuelle", icon: null, enrichable: true },
      reguliere: { label: "Mission régulière", icon: null, enrichable: true },
      temps_plein: { label: "Mission à temps plein", icon: null, enrichable: true },
      je_ne_sais_pas: { label: "Je ne sais pas encore", icon: null, enrichable: false },
    },
  },

  competence_rome: {
    label: "Compétences (référentiel ROME)",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      management_social_soin: { label: "Management, social, soin", icon: "🤲", enrichable: true },
      communication_creation_numerique: { label: "Communication, création, innovation, nouvelles technologies", icon: "💻", enrichable: true },
      production_construction_qualite_logistique: { label: "Production, construction, qualité, logistique", icon: "🛠️", enrichable: true },
      gestion_pilotage_juridique: { label: "Gestion, pilotage, juridique", icon: "💼", enrichable: true },
      relation_client_commerce_strategie: { label: "Relation client, commerce, stratégie", icon: "📈", enrichable: true },
      cooperation_organisation_soft_skills: { label: "Coopération, organisation, soft skills", icon: "🤝", enrichable: true },
      securite_environnement_action_publique: { label: "Protection des personnes, de la société ou de l'environnement", icon: "🛡️", enrichable: true },
    },
  },

  region_internationale: {
    label: "Région internationale",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      europe: { label: "Europe", icon: null, enrichable: true },
      afrique: { label: "Afrique", icon: null, enrichable: true },
      amerique: { label: "Amérique", icon: null, enrichable: true },
      asie: { label: "Asie", icon: null, enrichable: true },
      je_ne_sais_pas: { label: "Je ne sais pas encore", icon: null, enrichable: false },
    },
  },

  engagement_intent: {
    label: "Intention d'engagement",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      aide_directe: { label: "Aide directe aux personnes", icon: "🤝", enrichable: true },
      transmission: { label: "Transmission / pédagogie / accompagnement de public", icon: "🎓", enrichable: true },
      animation: { label: "Animation d'actions ou de collectif", icon: "🎉", enrichable: true },
      action_terrain: { label: "Action terrain concrète (collecte, distribution, fabrication…)", icon: "🌱", enrichable: true },
      secours: { label: "Secours / intervention", icon: "🚒", enrichable: true },
      cadre_engage: { label: "Engagement en cadre structuré", icon: "🪖", enrichable: true },
      support_organisation: { label: "Organisation / gestion de projet / communication", icon: "🧠", enrichable: true },
      exploration: { label: "Je ne sais pas encore", icon: "🤷", enrichable: false },
    },
  },

  formation_onisep: {
    label: "Domaine de formation ONISEP",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      environnement_nature_sciences: { label: "Environnement, nature et sciences", icon: "🌱", enrichable: true },
      numerique_communication: { label: "Numérique et communication", icon: "💻", enrichable: true },
      commerce_gestion_finance: { label: "Commerce, gestion, finance et services", icon: "💼", enrichable: true },
      societe_droit_politique: { label: "Société, droit et politique", icon: "⚖️", enrichable: true },
      education_culture_creation: { label: "Éducation, culture et création", icon: "🧑‍🏫", enrichable: true },
      social_sante_sport: { label: "Social, santé et sport", icon: "🌍", enrichable: true },
      technique_industrie_construction: { label: "Technique, industrie et construction", icon: "🛠️", enrichable: true },
      securite_defense_logistique: { label: "Sécurité, défense et logistique", icon: "🚓", enrichable: true },
      je_ne_sais_pas: { label: "Je ne sais pas encore", icon: "🤷", enrichable: false },
    },
  },

  // ─── taxonomy gate (filtre dur dans le matching) ────────────────────────

  tranche_age: {
    label: "Tranche d'âge",
    type: "gate",
    enrichable: false, // pas enrichie par le LLM — calculée côté client (âge saisi)
    gate: true,
    values: {
      moins_26_ans: { label: "Moins de 26 ans", icon: null, enrichable: false },
      moins_31_ans_handicap: { label: "Moins de 31 ans — situation de handicap", icon: null, enrichable: false },
    },
  },
} as const;
