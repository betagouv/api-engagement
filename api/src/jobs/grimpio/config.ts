import { BUCKET_NAME, PUBLISHER_IDS } from "../../config";

export const GRIMPIO_XML_URL = `https://${BUCKET_NAME}.s3.fr-par.scw.cloud/xml/grimpio`;

export const GRIMPIO_PUBLISHER_ID = PUBLISHER_IDS.GRIMPIO;

// Domain and audience mappings (same as LinkedIn)
export const DOMAIN_MAPPING: { [key: string]: string } = {
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
};

export const AUDIENCE_MAPPING: { [key: string]: string } = {
  seniors: "Personnes âgées",
  persons_with_disabilities: "Personnes en situation de handicap",
  people_in_difficulty: "Personnes en difficulté",
  parents: "Parents",
  children: "Jeunes / enfants",
  public_refugees: "Nouveaux arrivants / Réfugiées",
  people_being_excluded: "Personnes en situation d'exclusion",
  people_sick: "Personnes malades",
  any_public: "Tous publics",
};

// Contract type mappings
export const JVA_CONTRACT_TYPE = "bénévolat";
export const ASC_CONTRACT_TYPE = "service_civique";
