import { PUBLISHER_IDS } from "@/config";

// Maximum number of days an entry can stay ONLINE on Piloty before being archived
// Only applies to publishers with quotas (unlimited publishers are never archived by age)
export const ONLINE_DAYS_LIMIT = 30;

export interface PublisherSyncConfig {
  publisherId: string;
  /** null = unlimited, all missions synchronized without quota */
  quotaByDomain: Record<string, number> | null;
}

export const PUBLISHER_SYNC_CONFIGS: PublisherSyncConfig[] = [
  {
    publisherId: PUBLISHER_IDS.JEVEUXAIDER,
    quotaByDomain: {
      "solidarite-insertion": 1800,
      sport: 750,
      "benevolat-competences": 450,
    },
  },
  {
    publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE,
    quotaByDomain: null, // full sync, no quota
  },
];

// Used to sign every Piloty API requests
export const MEDIA_PUBLIC_ID = "letudiant";

// Mapping between mission data and Piloty data
export const CONTRACT_MAPPING = {
  benevolat: "volunteering",
  volontariat: "civil_service",
};

// Mapping between mission data and Piloty data
export const REMOTE_POLICY_MAPPING = {
  fullRemote: "fulltime",
};

// Mapping between mission data and Piloty data
// Key is mission "domain" field
export const JOB_CATEGORY_MAPPING = {
  environnement: "environment_energie",
  "solidarite-insertion": "customer_service_customer_advisor",
  sante: "health_social",
  "culture-loisirs": "tourism_leisure",
  education: "education_training",
  emploi: "hr",
  sport: "arts_culture_sport",
  humanitaire: "hr_mobility",
  animaux: "health_social_pet_sitting",
  "vivre-ensemble": "health_social",
  autre: "customer_support", // TODO: find better fallback
};

export const DOMAIN_MAPPING = {
  animaux: "🐶 Protection des animaux",
  autre: "🎯 Missions sur-mesure",
  "benevolat-competences": "💼 Bénévolat de compétences",
  "culture-loisirs": "🎨 Arts & culture pour tous",
  education: "📚 Éducation pour tous",
  emploi: "💼 Emploi",
  environnement: "🌿 Protection de la nature",
  humanitaire: "🕊️ Humanitaire",
  "memoire-et-citoyennete": "📯 Mémoire et citoyenneté",
  "prevention-protection": "🚨 Prévention & Protection",
  sante: "💊 Santé pour tous",
  sport: "🏀 Sport pour tous",
  "solidarite-insertion": "🍜 Solidarité et insertion",
  "vivre-ensemble": "🌍 Coopération internationale",
} as { [key: string]: string };

export const AUDIENCE_MAPPING = {
  seniors: "Personnes âgées",
  persons_with_disabilities: "Personnes en situation de handicap",
  people_in_difficulty: "Personnes en difficulté",
  parents: "Parents",
  children: "Jeunes / enfants",
  public_refugees: "Nouveaux arrivants / Réfugiées",
  people_being_excluded: "Personnes en situation d'exclusion",
  people_sick: "Personnes malades",
  any_public: "Tous publics",
} as { [key: string]: string };
