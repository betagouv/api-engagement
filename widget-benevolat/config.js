const ENV = process.env.ENV || "development";
const API_URL = process.env.API_URL || "http://localhost:4000";
const SENTRY_DSN = process.env.SENTRY_DSN || "";

const DOMAINES = {
  environnement: "Environnement",
  "solidarite-insertion": "Solidarité et insertion",
  "prevention-protection": "Prévention et protection",
  sante: "Santé",
  "culture-loisirs": "Culture et loisirs",
  education: "Education",
  emploi: "Emploi",
  sport: "Sport",
  humanitaire: "Humanitaire",
  animaux: "Animaux",
  "vivre-ensemble": "Vivre ensemble",
  autre: "Autre",
  "mémoire et citoyenneté": "Mémoire et citoyenneté",
  "benevolat-competences": "Bénévolat de compétences",
};

module.exports = {
  ENV,
  API_URL,
  SENTRY_DSN,
  DOMAINES,
};
