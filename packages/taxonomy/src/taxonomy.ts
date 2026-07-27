// Source unique de vérité pour les taxonomies et valeurs de taxonomie.
//
// Champs par taxonomy :
//   label     — libellé affiché en UI / logs
//   type      — "multi_value" | "categorical" | "gate" | "value"
//   enrichable — true si la taxonomy est classifiée par le LLM (mission-enrichment)
//   gate        — true si la taxonomy est un filtre dur dans le matching engine
//   transformer — fonction optionnelle qui calcule des value keys depuis des params utilisateur
//
// Champs par valeur :
//   label      — libellé affiché
//   sublabel   — aide contextuelle optionnelle pour les UIs
//   icon       — emoji optionnel
//   enrichable — false pour les valeurs exclues de l'enrichissement (ex : je_ne_sais_pas)
//   disabled   — true pour griser l'option en UI (fonctionnalité pas encore disponible)

import { DEPARTMENT_CODE_VALUES, resolveDepartmentCodeValues } from "./transformers/department-code";
import { resolveLocationValues } from "./transformers/location";
import { resolveTrancheAgeValues } from "./transformers/tranche-age";

export const TAXONOMY = {
  // ─── Taxonomies enrichissables ────────────────────────────────────────────

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
  domaine: {
    label: "Domaine",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      sante_soins: {
        label: "Santé et soins",
        icon: "🩺",
        sublabel: "Prendre soin des autres au quotidien",
        enrichable: true,
      },
      social_solidarite: {
        label: "Social et solidarité",
        icon: "🤝",
        sublabel: "Accompagner les personnes vulnérables",
        enrichable: true,
      },
      environnement_nature: {
        label: "Environnement et nature",
        icon: "🌿",
        sublabel: "Agir pour la planète et les territoires",
        enrichable: true,
      },
      sport_animation: {
        label: "Sport et animation sportive",
        icon: "⚽",
        sublabel: "Encadrer, motiver, transmettre par le sport",
        enrichable: true,
      },
      culture_arts: {
        label: "Culture et arts",
        icon: "🎨",
        sublabel: "Créer, animer, faire rayonner",
        enrichable: true,
      },
      education_transmission: {
        label: "Éducation et transmission",
        icon: "🎓",
        sublabel: "Apprendre, encadrer, faire grandir",
        enrichable: true,
      },
      securite_defense: {
        label: "Sécurité et défense",
        icon: "🛡️",
        sublabel: "Protéger les personnes et les biens",
        enrichable: true,
      },
      international_humanitaire: {
        label: "International et humanitaire",
        icon: "🌍",
        enrichable: true,
      },
      gestion_projet: {
        label: "Gestion de projet",
        icon: "📋",
        sublabel: "Organiser, coordonner, piloter",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        icon: "🤔",
        sublabel: "Je découvrirai en explorant les missions",
        enrichable: false,
      },
    },
  },

  domaine_engagement: {
    label: "Domaine d’engagement",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      sante_bien_etre: {
        label: "Santé et bien-être",
        icon: "🩺",
        sublabel: "Soins, prévention, santé mentale et qualité de vie",
        enrichable: true,
      },
      sport: {
        label: "Sport",
        icon: "⚽",
        sublabel: "Pratique sportive, animation et inclusion par le sport",
        enrichable: true,
      },
      solidarite_inclusion: {
        label: "Solidarité et inclusion",
        icon: "🤝",
        sublabel: "Entraide, accompagnement et lutte contre l’exclusion",
        enrichable: true,
      },
      environnement_animaux: {
        label: "Environnement et animaux",
        icon: "🌿",
        sublabel: "Nature, biodiversité, transition écologique et protection animale",
        enrichable: true,
      },
      art_culture: {
        label: "Art et culture",
        icon: "🎨",
        sublabel: "Création, patrimoine, médiation et événements culturels",
        enrichable: true,
      },
      securite_secours: {
        label: "Sécurité et secours",
        icon: "🛡️",
        sublabel: "Prévention, protection des populations et intervention",
        enrichable: true,
      },
      citoyennete: {
        label: "Citoyenneté",
        icon: "🏛️",
        sublabel: "Vie civique, démocratie, droits et intérêt général",
        enrichable: true,
      },
      numerique: {
        label: "Numérique",
        icon: "💻",
        sublabel: "Outils numériques, inclusion digitale et technologies",
        enrichable: true,
      },
      education: {
        label: "Éducation",
        icon: "🎓",
        sublabel: "Apprentissage, transmission et accompagnement éducatif",
        enrichable: true,
      },
    },
  },

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
  secteur_activite: {
    label: "Secteur d'activité (référentiel ROME)",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      sante_social_aide_personne: {
        label: "Santé, social et aide à la personne",
        icon: "🏥",
        sublabel: "Soigner, accompagner, soutenir",
        enrichable: true,
      },
      education_formation_animation: {
        label: "Éducation, formation et animation",
        icon: "🎓",
        sublabel: "Transmettre, apprendre, encadrer",
        enrichable: true,
      },
      securite_service_public: {
        label: "Sécurité et service public",
        icon: "🛡️",
        sublabel: "Protéger et servir la collectivité",
        enrichable: true,
      },
      environnement_agriculture: {
        label: "Environnement et agriculture",
        icon: "🌿",
        sublabel: "Préserver la nature et les territoires",
        enrichable: true,
      },
      culture_creation_medias: {
        label: "Culture, création et médias",
        icon: "🎨",
        sublabel: "Créer, diffuser, faire rayonner",
        enrichable: true,
      },
      numerique_communication: {
        label: "Numérique et communication",
        icon: "💻",
        sublabel: "Innover, connecter, informer",
        enrichable: true,
      },
      batiment_industrie_logistique: {
        label: "Bâtiment, industrie et logistique",
        icon: "🏗️",
        sublabel: "Construire, produire, organiser",
        enrichable: true,
      },
      gestion_commerce_organisation: {
        label: "Gestion, commerce et organisation",
        icon: "📊",
        sublabel: "Gérer, coordonner, développer",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        icon: "🤔",
        sublabel: "Je découvrirai en explorant les missions",
        enrichable: false,
      },
    },
  },

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
  type_mission: {
    label: "Type / durée de mission",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      ponctuelle: {
        label: "Mission ponctuelle",
        sublabel: "Quelques heures ou quelques jours, une fois",
        icon: "😇‍",
        enrichable: true,
      },
      reguliere: {
        label: "Mission régulière",
        sublabel: "Quelques heures par semaine ou par mois. Certaines missions peuvent être indemnisées",
        icon: "☺️",
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

  rythme: {
    label: "Rythme de mission",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      ponctuelle_journee: {
        label: "Une mission ponctuelle, sur une journée",
        sublabel: "Une intervention unique concentrée sur une journée",
        icon: "📅",
        enrichable: true,
      },
      quelques_heures_semaine: {
        label: "Quelques heures par semaine",
        sublabel: "Un engagement régulier compatible avec un emploi du temps quotidien",
        icon: "🕐",
        enrichable: true,
      },
      plusieurs_jours_semaine: {
        label: "Plusieurs jours par semaine",
        sublabel: "Un engagement soutenu réparti chaque semaine",
        icon: "🗓️",
        enrichable: true,
      },
      quelques_jours_annee: {
        label: "Quelques jours répartis dans l’année",
        sublabel: "Des interventions occasionnelles à différents moments de l’année",
        icon: "🔁",
        enrichable: true,
      },
      temps_plein_plusieurs_mois: {
        label: "À temps plein pendant plusieurs mois",
        sublabel: "Un engagement intensif et continu sur plusieurs mois",
        icon: "⏱️",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        sublabel: "Je déciderai en découvrant les missions",
        icon: "🤔",
        enrichable: false,
      },
    },
  },

  // Dispositif d'engagement de la mission. Valeur déterministe injectée depuis `mission.type`
  // (cf. SCORING_RULES.type côté API), pas enrichie par le LLM. Pour l'instant seuls bénévolat,
  // service civique et pompiers sont mappés ; les réserves arriveront quand un discriminant
  // permettra de les distinguer (l'enum MissionType n'a qu'un seul `volontariat_reserve_operationnelle`).
  dispositif: {
    label: "Dispositif d'engagement",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      benevolat: { label: "Bénévolat", icon: null, enrichable: false },
      service_civique: { label: "Service civique", icon: null, enrichable: false },
      sapeurs_pompiers: { label: "Pompiers volontaires", icon: null, enrichable: false },
      reserve_gendarmerie: { label: "Réserve Gendarmerie", icon: null, enrichable: false, disabled: true },
      reserve_police_nationale: { label: "Réserve Police Nationale", icon: null, enrichable: false, disabled: true },
      reserve_armees: { label: "Réserves des armées", icon: null, enrichable: false, disabled: true },
    },
  },

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
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
      je_ne_sais_pas: { label: "Autre / Je ne sais pas", icon: "‍‍🤔‍", enrichable: false },
    },
  },

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
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

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
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

  activite: {
    label: "Type d’activité",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      aider_accompagner: {
        label: "Aider et accompagner des personnes",
        icon: "🤝",
        sublabel: "Accueil, écoute, visites, aide quotidienne et soutien à des bénéficiaires",
        enrichable: true,
      },
      transmettre_animer: {
        label: "Transmettre et animer",
        icon: "🎓",
        sublabel: "Tutorat, sensibilisation, formation, ateliers et activités collectives",
        enrichable: true,
      },
      fabriquer_reparer_terrain: {
        label: "Fabriquer, réparer ou agir sur le terrain",
        icon: "🛠️",
        sublabel: "Chantiers, bricolage, collecte, entretien, logistique et actions environnementales",
        enrichable: true,
      },
      secourir_proteger: {
        label: "Secourir et protéger",
        icon: "🛡️",
        sublabel: "Secours, prévention, surveillance, sécurité civile et protection des populations",
        enrichable: true,
      },
      organiser_coordonner: {
        label: "Organiser et coordonner",
        icon: "📋",
        sublabel: "Événements, gestion de projet, planification, logistique et coordination d’équipes",
        enrichable: true,
      },
      creer_communiquer: {
        label: "Créer et communiquer",
        icon: "🎨",
        sublabel: "Photo, vidéo, rédaction, graphisme, réseaux sociaux et création de supports",
        enrichable: true,
      },
    },
  },

  equipe: {
    label: "Cadre d’équipe",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      autonomie: {
        label: "Plutôt en autonomie",
        icon: "🧑",
        sublabel: "Missions individuelles, tâches indépendantes ou interventions à distance",
        enrichable: true,
      },
      petit_groupe: {
        label: "Dans un petit groupe où l’on prend le temps de se connaître",
        icon: "👥",
        sublabel: "Petites équipes, accompagnement régulier, missions locales et relations suivies",
        enrichable: true,
      },
      grand_collectif: {
        label: "Dans un grand collectif où il y a beaucoup de monde",
        icon: "👨‍👩‍👧‍👦",
        sublabel: "Événements, rassemblements et actions mobilisant de nombreux participants",
        enrichable: true,
      },
      peu_importe: {
        label: "Peu importe",
        icon: "🤷",
        sublabel: "La taille de l’équipe n’est pas un critère de choix",
        enrichable: false,
      },
    },
  },

  interaction: {
    label: "Mode d’interaction",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      interaction_collective: {
        label: "J’aime échanger et agir avec les autres",
        icon: "🤝",
        sublabel: "Actions collectives, animation, accueil et échanges réguliers",
        enrichable: true,
      },
      equilibre_collectif_autonomie: {
        label: "J’aime alterner les moments en groupe et en autonomie",
        icon: "⚖️",
        sublabel: "Temps collectifs combinés à des responsabilités individuelles",
        enrichable: true,
      },
      autonomie_principale: {
        label: "Je préfère avancer principalement en autonomie",
        icon: "🧑",
        sublabel: "Tâches individuelles demandant peu d’interactions continues",
        enrichable: true,
      },
      peu_importe: {
        label: "Peu importe",
        icon: "🤷",
        sublabel: "Le niveau d’interaction n’est pas un critère de choix",
        enrichable: false,
      },
    },
  },

  autonomie: {
    label: "Niveau d’autonomie et d’accompagnement",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      organisation_libre: {
        label: "On me donne un objectif et je m’organise librement",
        icon: "🧭",
        sublabel: "Responsabilités individuelles et organisation flexible",
        enrichable: true,
      },
      accompagnement_initial: {
        label: "J’aime être accompagné·e au début, puis gagner en autonomie",
        icon: "🌱",
        sublabel: "Intégration, formation initiale ou tutorat au démarrage",
        enrichable: true,
      },
      cadre_suivi_regulier: {
        label: "Je préfère avoir des consignes précises et un suivi régulier",
        icon: "📋",
        sublabel: "Référent identifié, tâches définies et points réguliers",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        icon: "🤔",
        sublabel: "Le niveau d’encadrement n’est pas encore un critère de choix",
        enrichable: false,
      },
    },
  },

  imprevu: {
    label: "Niveau d’imprévu",
    type: "categorical",
    enrichable: true,
    gate: false,
    values: {
      adaptation_rapide: {
        label: "J’aime quand il faut s’adapter rapidement",
        icon: "⚡",
        sublabel: "Situations changeantes demandant de réagir et de s’adapter",
        enrichable: true,
      },
      imprevu_modere: {
        label: "Un peu d’imprévu, ça me va",
        icon: "🌤️",
        sublabel: "Mission structurée conservant une certaine variété",
        enrichable: true,
      },
      cadre_previsible: {
        label: "Je préfère savoir à quoi m’attendre",
        icon: "📅",
        sublabel: "Tâches, horaires et organisation clairement définis",
        enrichable: true,
      },
      je_ne_sais_pas: {
        label: "Je ne sais pas encore",
        icon: "🤔",
        sublabel: "Le niveau d’imprévu n’est pas encore un critère de choix",
        enrichable: false,
      },
    },
  },

  // Taxonomie historique utilisée par les prompts d'enrichissement v1 à v4, mais plus par
  // le prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
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

  motivation_recherche: {
    label: "Motivation de recherche",
    type: "multi_value",
    enrichable: true,
    gate: false,
    values: {
      premiere_experience: {
        label: "Acquérir une première expérience",
        icon: "🌱",
        enrichable: true,
      },
      decouverte_metier: {
        label: "Découvrir un métier",
        icon: "🧭",
        enrichable: true,
      },
      agir_pour_une_cause: {
        label: "Agir pour une cause",
        icon: "🤝",
        enrichable: true,
      },
      rencontres: {
        label: "Rencontrer de nouvelles personnes",
        icon: "👥",
        enrichable: true,
      },
      indemnisation: {
        label: "Bénéficier d’une indemnisation",
        icon: "💶",
        enrichable: false,
      },
      securite_pays: {
        label: "Contribuer à la sécurité du pays",
        icon: "🛡️",
        enrichable: true,
      },
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

  // Taxonomie historique utilisée par les anciens parcours du quiz, mais plus par le
  // prochain parcours. À conserver sans modifier pour la rétrocompatibilité ; candidate
  // à une suppression lors d'une future migration.
  motivation: {
    label: "Motivation utilisateur",
    type: "categorical",
    enrichable: false,
    gate: false,
    values: {
      me_sentir_utile: {
        label: "Me sentir utile, rencontrer de nouvelles personnes",
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
        disabled: true,
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
        icon: "📄",
        enrichable: false,
      },
      decouvrir_domaine: {
        label: "Découvrir un nouveau domaine",
        sublabel: "Pour me ré-orienter, avoir une expérience pour tester...",
        icon: "🧭",
        enrichable: false,
      },
      experience_terrain: {
        label: "Avoir une 1ère expérience terrain",
        icon: "🌱",
        sublabel: "Me lancer concrètement dans le monde professionnel",
        enrichable: false,
      },
      partir_etranger: {
        label: "Partir à l'étranger",
        sublabel: "Vivre une expérience d'engagement dans un autre pays",
        icon: "🌍",
        enrichable: false,
        disabled: true,
      },
      competences_interet_general: {
        label: "Utiliser mes compétences pour l'intérêt général",
        icon: "💡",
        sublabel: "Mettre mon savoir-faire au service de la collectivité",
        enrichable: false,
      },
      reprendre_confiance: {
        label: "Reprendre confiance en moi",
        icon: "💪",
        sublabel: "Développer mes capacités et mon estime de moi",
        enrichable: false,
      },
      reprendre_activite: {
        label: "Garder / reprendre une activité",
        icon: "🔄",
        sublabel: "Rester actif·ve et maintenir un rythme",
        enrichable: false,
      },
      enrichir_cv: {
        label: "Enrichir mon CV",
        sublabel: "Acquérir des compétences en rapport avec mon métier",
        icon: "📄",
        enrichable: false,
      },
      preparer_reconversion: {
        label: "Préparer une reconversion professionnelle",
        sublabel: "Tester un nouveau domaine / métier",
        icon: "🧭",
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
      armee: { label: "Armée", sublabel: "Marine, Air, Santé...", icon: "🪖", enrichable: false },
      pompiers: { label: "Pompiers", sublabel: "Aide à la personne, secours, urgences...", icon: "🚒", enrichable: false },
      gendarmerie: { label: "Gendarmerie", sublabel: "Sécurité, territoire, enquêtes...", icon: "⚖️", enrichable: false },
      police: { label: "Police", sublabel: "Ordre public, investigation, protection...", icon: "🚔", enrichable: false },
      ne_sais_pas: { label: "Je ne sais pas", sublabel: "Aidez-moi à découvrir ma voie", icon: "🤔", enrichable: false },
      aucun: { label: "Aucun de ces choix", sublabel: "Je cherche autre chose", icon: "🙅", enrichable: false },
    },
  },

  location: {
    label: "Localisation",
    type: "value",
    enrichable: false,
    gate: false,
    transformer: resolveLocationValues,
    values: {},
  },

  departmentCode: {
    label: "Département",
    type: "multi_value",
    enrichable: false,
    gate: false,
    transformer: resolveDepartmentCodeValues,
    values: DEPARTMENT_CODE_VALUES,
  },

  // ─── taxonomy gate (filtre dur dans le matching) ────────────────────────

  tranche_age: {
    label: "Tranche d'âge",
    type: "gate",
    enrichable: false, // pas enrichie par le LLM — calculée côté client (âge saisi)
    gate: true,
    transformer: resolveTrancheAgeValues,
    values: {
      moins_18_ans: { label: "Moins de 18 ans", icon: null, enrichable: false },
      entre_18_25_ans: { label: "18-25 ans", icon: null, enrichable: false },
      entre_25_30_ans: { label: "25-30 ans", icon: null, enrichable: false },
      entre_30_45_ans: { label: "30-45 ans", icon: null, enrichable: false },
      entre_46_67_ans: { label: "46-67 ans", icon: null, enrichable: false },
      entre_68_72_ans: { label: "68-72 ans", icon: null, enrichable: false },
      plus_72_ans: { label: "72 ans et plus", icon: null, enrichable: false },
      entre_16_17_ans: { label: "16-17 ans", icon: null, enrichable: false, hidden: true },
      entre_46_66_ans: { label: "46-66 ans", icon: null, enrichable: false, hidden: true },
      moins_31_ans_handicap: { label: "Moins de 31 ans — situation de handicap", icon: null, enrichable: false, hidden: true },
    },
  },
} as const;
