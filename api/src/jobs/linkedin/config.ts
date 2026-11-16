import { BUCKET_NAME, PUBLISHER_IDS } from "@/config";

export const LINKEDIN_XML_URL = `https://${BUCKET_NAME}.s3.fr-par.scw.cloud/xml/linkedin`;

export const LINKEDIN_PUBLISHER_ID = PUBLISHER_IDS.LINKEDIN;

// Pages entreprise LinkedIn : JVA et TTM (SC, SPV, réserve), puis les organisations ayant leur propre page.
export const LINKEDIN_PAGES = {
  JVA: { company: "jeveuxaider.gouv.fr", companyId: "11100845" },
  TTM: { company: "Trouvetamission", companyId: "146194199" },
} as const;

// Organisations ayant leur propre page LinkedIn (clé = organizationName), reprises de l'ancien flux.
// Les missions JVA et autres annonceurs de ces organisations y sont rattachées ; les autres retombent sur la page JVA.
export const LINKEDIN_ORGANIZATION_PAGES = {
  benevolt: "11022359",
  Makesense: "737838",
  "Lobby des Consciences": "65886275",
  "Article 1": "27203583",
  "Ma Petite Planète": "37251808",
  "La Fourmilière": "10137854",
  "L'ENVOL": "10204194",
  "Entraide Scolaire Amicale": "18336541",
  "Mon Emile Association": "43292744",
  "Communauté de Communes Rhône Lez Provence": "10603588",
  "Parrains Par Mille | PPM": "28978823",
  "SECOURS CATHOLIQUE 2A": "816177",
  "Coallia - MAINtenant": "14838053",
  "LA CRAVATE SOLIDAIRE MOBILE": "5186825",
  "RESTOS DU COEUR - 23": "5346642",
  "SECOURS CATHOLIQUE PYRENEES GASCOGNE (65/32)": "816177",
  "Fondation Partage et Vie": "3001926",
  "Protection Civile Paris Seine": "3493705",
  "Energie Jeunes - Grand Est & Franche Comté": "1104605",
  HopHopFood: "11136137",
  "La Ligue contre le cancer Loire-Atlantique": "11136137",
  "Secours Catholique du Gard": "1104605",
  "Armée du Salut (Fondation de l')": "10106687",
  "Emmaüs Cahors (46)": "3272543",
  "Energie Jeunes - Provence-Alpes-Côte d'Azur": "1104605",
  "Mutualite Française Centre Val de Loire": "27207455",
  "Protection Civile du Nord": "5342210",
  "SECOURS CATHOLIQUE 59": "816177",
  "ADMR du Morbihan": "49761428",
  "ARAVIC France victimes 19": "42458934",
  "Action Contre la Faim": "1334237",
  "Centre Communal d'Action Sociale (CCAS) de LONS LE SAUNIER": "14813865",
  "EMMAUS Solidarité": "3272543",
  "LIGUE CONTRE LE CANCER": "1999812",
  "La Cravate Solidaire Troyes": "69722073",
  "Les Restos du Coeur de l'Orne": "5346642",
  "Les Restos du Cœur - Eure": "5346642",
  "Petits Frères des Pauvres 64/40": "5109201",
  "Protection Civile du Val d'Oise": "3187369",
  "Secours Populaire de l'Eure": "15205609",
  // ZUPdeCO: "1899598",
  "1 Déchet Par Jour": "13032883",
  "ADMR du Nord": "18381666",
  AFEV: "10329919",
  "AFEV - Côte d'Or": "10329919",
  "Afev 06": "10329919",
  "Association Prévention Routière Île-de-France": "7214867",
  "Association Séphora Berrebi": "34715721",
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
