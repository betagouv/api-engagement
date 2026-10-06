import { DEPARTMENTS } from "@engagement/taxonomy";

export const STATUS_PLR = {
  PENDING: "À modérer",
  ONGOING: "En cours de traitement",
  ACCEPTED: "Acceptées",
  REFUSED: "Refusées",
};

export const LEBONCOIN_STATUS = {
  ACCEPTED: "Acceptées",
  EDITED: "Modifiées",
  DELETED: "Supprimées",
  REFUSED: "Refusées",
};

export const DOMAINS_LABELS = {
  environnement: "Environnement",
  nature: "Environnement",
  "solidarite-insertion": "Solidarité et insertion",
  solidarity: "Solidarité et insertion",
  social: "Solidarité et insertion",
  "prevention-protection": "Prévention et protection",
  sante: "Santé",
  "benevolat-competences": "Bénévolat-compétences",
  health: "Santé",
  "culture-loisirs": "Culture et loisirs",
  culture: "Culture et loisirs",
  education: "Education",
  emploi: "Emploi",
  employment: "Emploi",
  sport: "Sport",
  humanitaire: "Humanitaire",
  "humanitarian-aid": "Humanitaire",
  animal: "Animaux",
  animals: "Animaux",
  animaux: "Animaux",
  "vivre-ensemble": "Vivre ensemble",
  autre: "Autre",
  "": "Autre",
  "mémoire et citoyenneté": "Mémoire et citoyenneté",
  "citoyennete-europeenne": "Citoyenneté Européenne",
};

// Départements affichés dans les stats publiques : métropole + DROM (hors COM).
const DROM_CODES = ["971", "972", "973", "974", "976"];
export const DEPARTMENT_NAMES = Object.fromEntries(Object.entries(DEPARTMENTS).filter(([code]) => code.length <= 2 || DROM_CODES.includes(code)));

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Juil", "Aoû", "Sept", "Oct", "Nov", "Déc"];
export const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

export const WARNINGS = {
  EMPTY_WARNING: {
    emoji: <span aria-hidden="true">🙁</span>,
    name: "Flux vide",
    advice: "Il s’agit peut-être d’un problème dans l’envoi des données. Nous vous conseillons de vérifier votre flux.",
  },
  ERROR_WARNING: {
    emoji: <span aria-hidden="true">❌</span>,
    name: "Erreur de flux",
    advice: "Il s’agit peut-être d’un problème dans le formatage des données. Nous vous conseillons de vérifier votre flux.",
  },
  VALIDATION_WARNING: {
    emoji: <span aria-hidden="true">🙅</span>,
    name: "Taux de validation critique",
    advice: "Il s’agit sûrement d’une mauvaise donnée. Nous vous conseillons de vérifier votre flux.",
  },
  TRACKING_WARNING: {
    emoji: <span aria-hidden="true">🤔</span>,
    name: "Problème de tracking",
    advice: "Pour monitorer les candidatures, le script doit être ajouté. Nous vous recommandons de le vérifier.",
  },
  OTHER_WARNING: {
    emoji: <span aria-hidden="true">🤔</span>,
    name: "Alerte",
    advice: "Il s’agit sûrement d’une mauvaise donnée. Nous vous conseillons de vérifier votre flux.",
  },
};

export const REPORT_STATUS = {
  NOT_GENERATED_ERROR_GENERATION: "Erreur lors de la génération du rapport",
  NOT_GENERATED_NO_DATA: "Données insuffisantes pour générer le rapport",
  GENERATED: "Généré",
  NOT_SENT_NO_RECIPIENT: "Aucun email de contact renseigné",
  NOT_SENT_MISSING_URL: "URL manquante",
  NOT_SENT_ERROR_SENDING: "Erreur lors de l'envoi du rapport",
  SENT: "Envoyé",
};

export const PUBLISHER_CATEGORIES = {
  PUBLICS_SERVICES: "Services publics",
  ASSOCIATIF_ACTORS: "Acteurs associatifs",
  TERRITORIAL_COLLECTIVITIES: "Collectivités territoriales",
  PRIVATE_ORGANIZATIONS: "Organisations privées",
  SCHOOLS_AND_UNIVERSITIES: "Écoles & universités",
  MEDIA: "Médias",
  ENGAGEMENT_PLATFORMS: "Plateformes d'engagement",
  EMPLOYMENT_PLATFORMS: "Plateformes d'emploi",
  OTHERS: "Autres",
};

export const MISSION_TYPES = {
  VOLONTARIAT_SERVICE_CIVIQUE: { slug: "volontariat_service_civique", label: "Volontariat (Service Civique)" },
  BENEVOLAT: { slug: "benevolat", label: "Bénévolat" },
  VOLONTARIAT_SAPERS_POMPIERS: { slug: "volontariat_sapeurs_pompiers", label: "Volontariat (Sapeurs-Pompiers)" },
  VOLONTARIAT_RESERVE_OPERATIONNELLE: { slug: "volontariat_reserve_operationnelle", label: "Volontariat (Réserve opérationnelle)" },
};

export const MISSION_TYPE_OPTIONS = Object.values(MISSION_TYPES).map(({ slug, label }) => ({
  value: slug,
  label,
}));

export const METABASE_CARD_ID = {
  EVOLUTION_STAT_EVENT: "5497",
  DIFFUSEUR_TOTAL_MISSIONS: "5494",
  DIFFUSEUR_TOTAL_EVENTS: "5495",
  DIFFUSEUR_REPARITION_PAR_MOYEN_DIFFUSION: "5496",
  DIFFUSEUR_PERFORMANCE_ANNONCEURS: "5487",
  DIFFUSEUR_REPARITION_PAR_ANNONCEURS: "5488",
  DIFFUSEUR_MEAN_PUBLISHER_KPI: "5518",
  DIFFUSEUR_PERFORMANCE_PER_SOURCE: "5519",
  ANNONCEUR_TOTAL_EVENTS: "5490",
  ANNONCEUR_TOTAL_MISSIONS: "5498",
  ANNONCEUR_TOP_DIFFUSEURS: "5489",
  PUBLIC_STATS_GLOBAL: "5525",
  PUBLIC_STATS_GLOBAL_MONTHLY: "5538",
  PUBLIC_STATS_ACTIVE_MISSIONS: "5528",
  PUBLIC_STATS_ACTIVE_MISSIONS_DEPARTMENT: "5535",
  PUBLIC_STATS_ACTIVE_ORGANIZATIONS: "5531",
  PUBLIC_STATS_MISSIONS_DEPARTMENT: "5537",
  PUBLIC_STATS_MISSIONS_DOMAIN: "5536",
  ADMIN_STATS_ENGAGEMENT_REDIRECTIONS: "5726",
  ADMIN_STATS_ENGAGEMENT_CANDIDATURES: "5727",
  ADMIN_STATS_MISSIONS_ACTIVES: "5728",
  ADMIN_STATS_MISSIONS_CREEES: "5729",
  ADMIN_STATS_TOP_DIFFUSEURS: "5730",
  ADMIN_STATS_TOP_ANNONCEURS: "5731",
  ADMIN_STATS_PARTNERS_TABLE: "5742",
};
