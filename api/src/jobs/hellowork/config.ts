// Quota temporaire par annonceur : flux lisible pour l'envoi de l'échantillon. À retirer ensuite.
export const HELLOWORK_MAX_OFFERS_PER_ANNONCEUR = 500;

export const CONTRACT_TYPE_STAGE = "Stage";
export const DEFAULT_SECTOR = "Santé/Social/Association";

// Repli Hellowork : `Ville` est obligatoire, une mission 100 % à distance sans adresse est localisée à Paris.
export const REMOTE_ADDRESS = { postalCode: "75001", city: "Paris", country: "France" };

// domain (slug API) → libellé `CritereSecteur` du référentiel Hellowork (§ 3.2 du PDF).
export const DOMAIN_SECTOR: Record<string, string> = {
  "solidarite-insertion": "Santé/Social/Association",
  sante: "Santé/Social/Association",
  "vivre-ensemble": "Santé/Social/Association",
  humanitaire: "Santé/Social/Association",
  animaux: "Santé/Social/Association",
  autre: "Santé/Social/Association",
  education: "Enseignement/Formation",
  recherche: "Enseignement/Formation",
  "culture-loisirs": "Tourisme/Hôtellerie/Loisirs",
  sport: "Tourisme/Hôtellerie/Loisirs",
  environnement: "Secteur Energie/Environnement",
  "service-public-defense-securite": "Service public d'état",
  "citoyennete-europeenne": "Service public autres",
  "prevention-protection": "Service public autres",
  "memoire-et-citoyennete": "Service public autres",
  "batiment-industrie-logistique": "BTP",
  "benevolat-competences": "Services aux Entreprises",
  emploi: "Services aux Entreprises",
  communication: "Média/Internet/Communication",
  "gestion-finance-droit": "Banque/Assurance/Finance",
  numerique: "Secteur informatique/ESN",
};

// remote → `Criteres/Teletravail`
export const TELEWORK: Record<string, string> = { full: "Complet", possible: "Partiel" };
export const TELEWORK_NONE = "Non";

// compensationUnit → `NiveauSalaire/@Periodicite`
export const SALARY_PERIOD: Record<string, string> = { hour: "HOUR", day: "DAY", month: "MONTH", year: "YEAR" };

// Texte « Profil recherché » fourni par Hellowork (maquette), en tête du profil de chaque offre Service Civique.
export const SC_PROFIL_HTML =
  "<p>Pour postuler à un Service Civique, vous devez obligatoirement :</p>" +
  "<ul>" +
  "<li>Avoir 16 à 25 ans (jusqu'à 30 ans, pour les personnes en situation de handicap)</li>" +
  "<li>Être ressortissant français, UE (ou hors UE avec titre de séjour valide)</li>" +
  "</ul>" +
  "<p>L'indemnité mensuelle s'élève à 619,83 € nets (non imposable), avec une majoration possible selon votre situation.</p>" +
  "<p>Le Service Civique permet de réaliser des missions dans différents domaines d'actions, pour se sentir utile, acquérir des compétences ou se découvrir.</p>";
