export const DOMAIN_LABELS: Record<string, string> = {
  animaux: "Animaux",
  autre: "Interventions d'urgence",
  "batiment-industrie-logistique": "Bâtiment, Industrie, Logistique",
  "benevolat-competences": "Bénévolat de compétences",
  communication: "Communication",
  "culture-loisirs": "Culture et loisirs",
  education: "Éducation pour tous",
  emploi: "Emploi",
  environnement: "Environnement",
  "gestion-finance-droit": "Gestion, commerce, finance, droit et services",
  humanitaire: "International et humanitaire",
  numerique: "Numérique",
  "memoire-et-citoyennete": "Mémoire et citoyenneté",
  "prevention-protection": "Prévention et protection",
  recherche: "Recherche",
  sante: "Santé",
  "service-public-defense-securite": "Défense et sécurité",
  sport: "Sport",
  "solidarite-insertion": "Solidarité",
  "vivre-ensemble": "Mémoire et citoyenneté",
};

export const getDomainLabel = (domain: string | null): string | null => (domain ? (DOMAIN_LABELS[domain] ?? domain) : null);
