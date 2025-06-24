import { BUCKET_NAME } from "../../config";

export const LINKEDIN_ID = "5f8b3c7552a1412baaa0cd44";

export const BENEVOLT_ID = "5f592d415655a711feb4460e";
export const FONDATION_RAOUL_FOLLEREAU_ID = "634e641783b660072d4c597e";
export const VILLE_DE_NANTES_ID = "6347be8883b660072d4c1c53";
export const VACANCES_ET_FAMILLES_ID = "619fb1e17d373e07aea8be32";
export const PREVENTION_ROUTIERE_ID = "619fab857d373e07aea8be1e";
export const MEDECINS_DU_MONDE_ID = "619fae737d373e07aea8be23";
export const EGEE_ID = "619faf257d373e07aea8be27";
export const ECTI_ID = "619faeb97d373e07aea8be24";
export const ADIE_ID = "619fb52a7d373e07aea8be35";
export const LINKEDIN_XML_URL = `https://${BUCKET_NAME}.s3.fr-par.scw.cloud/xml/linkedin`;

export const PARTNERS_IDS = [
  BENEVOLT_ID,
  FONDATION_RAOUL_FOLLEREAU_ID,
  VILLE_DE_NANTES_ID,
  VACANCES_ET_FAMILLES_ID,
  PREVENTION_ROUTIERE_ID,
  MEDECINS_DU_MONDE_ID,
  EGEE_ID,
  ECTI_ID,
  ADIE_ID,
];

export const LINKEDIN_COMPANY_ID = {
  "jeveuxaider.gouv.fr": "11100845",
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

export const LINKEDIN_INDUSTRY_CODE = {
  environnement: 86,
  "solidarite-insertion": null,
  sante: 14,
  "culture-loisirs": 30,
  education: 67,
  emploi: 137,
  sport: 33,
  humanitaire: null,
  animaux: 16,
  "vivre-ensemble": null,
  autre: null,
} as { [key: string]: number | null };
