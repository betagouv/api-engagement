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
