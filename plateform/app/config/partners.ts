import AscPng from "~/assets/images/logo/asc-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";

export type Partner = {
  name: string;
  description: string;
  // Sans `url`, le nom du partenaire s'affiche sans lien.
  url?: string;
  logo: string;
};

// Liste générique, partagée par les deux rendus (bandeau de bas de page et carrousel de la home). Une page
// qui a ses propres campagnes de redirection passe sa liste en prop plutôt que d'utiliser celle-ci.
export const DEFAULT_PARTNERS: Partner[] = [
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/4de09e85-0651-4eff-af78-a825041ef303",
    logo: JvaPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général rémunérées.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/b6e310b8-961c-4d2d-a7b4-94b383adce64",
    logo: AscPng,
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/e681deef-81d8-40b7-b78f-af40eb29f151",
    logo: SpvPng,
  },
  {
    // Lien direct vers le site de la Gendarmerie : pas de redirection /r/campaign, les clics ne sont donc pas tracés.
    name: "La réserve de la Gendarmerie nationale",
    description: "Des missions rémunérées de réservistes.",
    url: "https://www.gendarmerie.interieur.gouv.fr/reserves/reserve-operationnelle-de-la-gendarmerie-nationale",
    logo: RocPng,
  },
];
