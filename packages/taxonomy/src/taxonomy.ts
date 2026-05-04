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
//   sublabel   — aide contextuelle optionnelle pour les UIs
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
      ponctuelle: {
        label: "Mission ponctuelle",
        sublabel: "Quelques heures ou quelques jours, une fois.",
        icon: "😇‍",
        enrichable: true,
      },
      reguliere: {
        label: "Mission régulière",
        sublabel: "Quelques heures par semaine ou par mois. Certaines missions peuvent être indemnisées",
        icon: "😇‍",
        enrichable: true,
      },
      temps_plein: {
        label: "Mission à temps plein",
        sublabel: "Plusieurs jours par semaine pendant plusieurs mois, les missions sont souvent indemnisées",
        icon: "🤠‍",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        sublabel: "Je déciderai en découvrant les missions",
        icon: "🤔‍",
        enrichable: false,
      },
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

  // ─── Taxonomies déclaratives côté quiz, non enrichies par LLM ─────────────

  statut: {
    label: "Statut utilisateur",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      lyceen: { label: "Je suis au lycée", icon: "🧑‍", enrichable: false },
      etudiant: { label: "Je fais des études", icon: "🎓", enrichable: false },
      demandeur_emploi: { label: "Je recherche un emploi", icon: "🕵️‍♂️", enrichable: false },
      actif: { label: "J’ai une activité professionnelle", icon: "💼", enrichable: false },
      retraite: { label: "Je suis à la retraite", icon: "👴", enrichable: false },
      autre: { label: "Autre situation", icon: "🤷", enrichable: false },
    },
  },

  handicap: {
    label: "Situation de handicap",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      oui: { label: "Oui", icon: null, enrichable: false },
      non: { label: "Non", icon: null, enrichable: false },
      ne_se_prononce_pas: { label: "Je préfère ne pas répondre", icon: null, enrichable: false },
    },
  },

  motivation: {
    label: "Motivation utilisateur",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      me_sentir_utile: {
        label: "Aider les autres",
        sublabel: "Être utile à des personnes ou à une cause",
        icon: "🙏🏻",
        enrichable: false,
      },
      booster_parcoursup: {
        label: "Booster mon dossier Parcoursup",
        sublabel: "Apprendre des compétences",
        icon: "🎓",
        enrichable: false,
      },
      tester_orientation: {
        label: "Tester une orientation",
        sublabel: "Explorer un secteur ou un métier",
        icon: "🧭",
        enrichable: false,
      },
      servir_le_pays: {
        label: "Servir le pays",
        sublabel: "Participer à des missions d'intérêt général",
        icon: "🇫🇷",
        enrichable: false,
      },
      ne_sais_pas: {
        label: "Je ne sais pas encore",
        sublabel: "Je déciderai en découvrant les missions",
        icon: "🤔‍",
        enrichable: false,
      },
      booster_cv: {
        label: "Booster mon CV",
        sublabel: "Acquérir des compétences en rapport avec mes études",
        icon: null,
        enrichable: false,
      },
      decouvrir_domaine: {
        label: "Découvrir un nouveau domaine",
        sublabel: "Pour me ré-orienter, avoir une expérience pour tester...",
        icon: null,
        enrichable: false,
      },
      experience_terrain: { label: "Avoir une 1ère expérience terrain", icon: null, enrichable: false },
      partir_etranger: {
        label: "Partir à l'étranger",
        sublabel: "Vivre une expérience d'engagement dans un autre pays",
        icon: "🌍",
        enrichable: false,
      },
      competences_interet_general: { label: "Utiliser mes compétences pour l'intérêt général", icon: null, enrichable: false },
      reprendre_confiance: { label: "Reprendre confiance en moi", icon: null, enrichable: false },
      reprendre_activite: { label: "Garder / reprendre une activité", icon: null, enrichable: false },
      enrichir_cv: {
        label: "Enrichir mon CV",
        sublabel: "Acquérir des compétences en rapport avec mon métier",
        icon: null,
        enrichable: false,
      },
      preparer_reconversion: {
        label: "Préparer une reconversion professionnelle",
        sublabel: "Tester un nouveau domaine / métier",
        icon: null,
        enrichable: false,
      },
    },
  },

  parcoursup_formation: {
    label: "Formation Parcoursup identifiée",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      oui: { label: "Oui", icon: null, enrichable: false },
      non: { label: "Non", icon: null, enrichable: false },
    },
  },

  servir_pays: {
    label: "Cadre de service du pays",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      armee: { label: "Armée", sublabel: "Marine, Air, Santé...", icon: null, enrichable: false },
      pompiers: { label: "Pompiers", icon: null, enrichable: false },
      gendarmerie: { label: "Gendarmerie", icon: null, enrichable: false },
      police: { label: "Police", icon: null, enrichable: false },
      ne_sais_pas: { label: "Je ne sais pas", icon: null, enrichable: false },
      aucun: { label: "Aucun de ces choix", icon: null, enrichable: false },
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
