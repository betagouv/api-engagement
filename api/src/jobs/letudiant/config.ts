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
  "solidarite-insertion": "arts_culture_sport_professional_dancer", // TODO
  sante: "health_social",
  "culture-loisirs": "tourism_leisure",
  education: "education_training",
  emploi: "hr",
  sport: "arts_culture_sport",
  humanitaire: "arts_culture_sport_professional_dancer", // TODO
  animaux: "health_social_pet_sitting",
  "vivre-ensemble": "health_social",
  autre: "arts_culture_sport_professional_dancer", // TODO: find better fallback
};
