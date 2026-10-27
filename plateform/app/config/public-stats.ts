// Cards Metabase de la page /statistiques (doivent être déclarées `public` côté API).
export const STATS_CARDS = {
  homepageViews: 6575,
  quizStarted: 6577,
  quizCompleted: 6576,
  redirections: 6583,
  impressions: 6578,
  departments: 6582,
} as const;

// La card des réponses ne renvoie pas la question : elle est interrogée une fois par question via son paramètre.
export const STATS_ANSWERS_CARD = 6584;

export const STATS_QUESTIONS = ["Âge", "Handicap reconnu", "Région", "Déplacements", "Ce qui les amène", "Rythme souhaité", "Domaines", "Activités", "Équipe", "Cadre de travail"];

export const STATS_CACHE_TTL_MS = 5 * 60 * 1000;
export const STATS_PARTIAL_CACHE_TTL_MS = 30 * 1000;

// Codes région INSEE (en texte, sans zéro initial pour l'outre-mer) attendus par la variable Metabase `region`.
export const STATS_REGIONS: Record<string, string> = {
  "84": "Auvergne-Rhône-Alpes",
  "27": "Bourgogne-Franche-Comté",
  "53": "Bretagne",
  "24": "Centre-Val de Loire",
  "94": "Corse",
  "44": "Grand Est",
  "32": "Hauts-de-France",
  "11": "Île-de-France",
  "28": "Normandie",
  "75": "Nouvelle-Aquitaine",
  "76": "Occitanie",
  "52": "Pays de la Loire",
  "93": "Provence-Alpes-Côte d'Azur",
  "1": "Guadeloupe",
  "2": "Martinique",
  "3": "Guyane",
  "4": "La Réunion",
  "6": "Mayotte",
};
