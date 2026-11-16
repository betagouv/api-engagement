import { BUCKET_NAME, PUBLISHER_IDS } from "@/config";

export const LINKEDIN_XML_URL = `https://${BUCKET_NAME}.s3.fr-par.scw.cloud/xml/linkedin`;

export const LINKEDIN_PUBLISHER_ID = PUBLISHER_IDS.LINKEDIN;

// Pages entreprise LinkedIn : JVA et TTM (SC, SPV, réserve), puis les partenaires ayant leur propre page.
export const LINKEDIN_PAGES = {
  JVA: { company: "jeveuxaider.gouv.fr", companyId: "11100845" },
  TTM: { company: "Trouvetamission", companyId: "146194199" },
} as const;

// Partenaires ayant leur propre page (clé = organizationName). Les autres retombent sur la page JVA.
export const LINKEDIN_PARTNER_PAGES = {
  benevolt: "11022359",
} as { [key: string]: string };

export const DESCRIPTION_MIN_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 25000;

export const LINKEDIN_INDUSTRY_CODE = {
  environnement: 2368,
  "solidarite-insertion": 2125,
  sante: 14,
  "culture-loisirs": 28,
  education: 67,
  emploi: 2125,
  sport: 2027,
  humanitaire: 2122,
  animaux: 2282,
  "vivre-ensemble": 90,
  autre: 100,
} as { [key: string]: number | null };

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
