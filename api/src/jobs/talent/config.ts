import { BUCKET_NAME, PUBLISHER_IDS } from "../../config";

export const TALENT_XML_URL = `https://${BUCKET_NAME}.s3.fr-par.scw.cloud/xml/talent`;

export const TALENT_PUBLISHER_ID = PUBLISHER_IDS.LINKEDIN;

export const CATEGORY_MAPPING = {
  art: "Arts",
  "taches-administratives": "Administration",
  conseil: "Consulting",
  informatique: "IT",
  logistique: "Logistics",
  alphabetisation: "Education",
  jardinage: "Agriculture",
  "aide-psychologique": "Healthcare",
  "activites-manuelles": "Skilled Labor", //?
  "encadrement-d-equipes": "Social Care", //?
  bricolage: "Construction",
  "sante-soins": "Healthcare",
  visites: "Travel",
  distribution: "Food Industry",
  "soutien-scolaire": "Education",
  "gestion-recherche-des-partenariats": "Marketing", //?
  "ecoute-permanence": "Social Care", //?
  recrutement: "Human Resources",
  juridique: "Legal",
  "accueil-de-public": "Social Care", //?
  "enseignement-formation": "Education",
  "comptabilite-finance": "Finance",
  secourisme: "Security",
  "gestion-de-projets": "Consulting", //?
  "mentorat-parrainage": "Consulting",
  "mission-internationale": undefined,
  collecte: undefined,
  animation: undefined,
  communication: undefined,
  "documentation-traduction": undefined,
  "responsabilites-associatives": undefined,
  sport: undefined,
  autre: undefined,
};
