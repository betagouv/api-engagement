const ENV = process.env.ENV || "development";
const API_URL = process.env.API_URL || "http://localhost:4000";
const SENTRY_DSN = process.env.SENTRY_DSN || "";

const DOMAINS = {
  environnement: {
    label: "Environnement",
    icon: "",
    color: "#498501",
  },
  "solidarite-insertion": {
    label: "Solidarité",
    icon: "",
    color: "#BC5401",
  },
  sante: {
    label: "Santé",
    icon: "",
    color: "#d10066",
  },
  "culture-loisirs": {
    label: "Culture et loisirs",
    icon: "",
    color: "#8637ae",
  },
  education: {
    label: "Éducation pour tous",
    icon: "",
    color: "#007C94",
  },
  sport: {
    label: "Sport",
    icon: "",
    color: "#242bb1",
  },
  humanitaire: {
    label: "Développement international et aide humanitaire",
    icon: "",
    color: "#017c51",
  },
  "vivre-ensemble": {
    label: "Mémoire et citoyenneté",
    icon: "",
    color: "#8c7500",
  },
  "citoyennete-europeenne": {
    label: "Citoyenneté européenne",
    icon: "",
    color: "#ffca00",
  },
  autre: {
    label: "Interventions d'urgence en cas de crise",
    icon: "",
    color: "#be0023",
  },
};

const SCHEDULES = {
  part_time: "24 à 30h par semaine",
  full_time: "Plus de 30h par semaine",
  special: "Horaires spécifiques",
};

const BENEFICIARIES = {
  tous_publics: "Tous publics",
  young: "Jeunes",
  seniors: "Seniors",
  marginalisees_fragilisees: "Personnes marginalisées ou fragilisées",
  handicap: "Personnes avec handicap",
  faune_flaure: "Animaux et végétaux",
  adultes: "Adultes",
};

const ACTIONS = {
  soutien_accompagnement: "Soutien, accompagnement",
  animation_valorisation: "Animation, valorisation",
  transmission_pedagogie: "Transmission, pédagogie",
  mediation_information: "Médiation, information",
  preservation_restauration: "Préservation, patrimoine",
  secours_aide: "Secours, aide",
  prevention_sensibilisation: "Prévention, sensibilisation",
};

const ACCESSIBILITIES = {
  reducedMobilityAccessible: "Aux personnes à mobilité réduite",
  closeToTransport: "En transports en commun",
};

const MINORS = {
  yes: "Accessible à tous dès 16 ans",
  no: "Majeur uniquement",
};

module.exports = {
  ENV,
  API_URL,
  SENTRY_DSN,
  DOMAINS,
  SCHEDULES,
  BENEFICIARIES,
  ACTIONS,
  ACCESSIBILITIES,
  MINORS,
};
