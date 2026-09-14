import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import SpvPng from "~/assets/images/spv-logo.png";

export type Partner = {
  name: string;
  description: string;
  // Sans `url`, le nom du partenaire s'affiche sans lien.
  url?: string;
  logo: string;
};

const DEFAULT_PARTNERS: Partner[] = [
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

const DEFAULT_TITLE = "Il y a plein d'autres missions…";
const DEFAULT_DESCRIPTION = "…directement sur les sites qui les proposent, jettes-y un coup d'oeil !";

// `partners` : liste propre à la page appelante (partenaires affichés et liens de redirection dédiés,
// pour attribuer les clics à cette page). Par défaut, les quatre partenaires génériques.
export default function Partners({
  style = "default",
  partners = DEFAULT_PARTNERS,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: {
  style?: "default" | "compact";
  partners?: Partner[];
  title?: string;
  description?: string | null;
}) {
  return (
    <section className="bg-beige-gris-galet-975">
      <div className={`fr-container ${style === "compact" ? "py-6! md:py-12! px-6!" : "fr-py-8w"}`}>
        <h2 className="fr-h2 mb-2!">{title}</h2>
        {description !== undefined && <p className="mb-6! text-title-grey fr-text--lead">{description}</p>}

        <ul
          role="list"
          className={`list-none! p-0! m-0! ${style === "compact" ? "flex flex-col md:flex-row items-start justify-between gap-8 md:gap-0" : "grid grid-cols-1 gap-4 md:grid-cols-2"}`}
        >
          {partners.map((partner) => (
            <li key={partner.name} className={`flex items-start gap-2 ${style === "compact" ? "flex-1" : "gap-4"}`}>
              <div className="flex items-center justify-center bg-white rounded-sm p-1">
                <img src={partner.logo} alt="" className="size-10 shrink-0 rounded object-contain" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="fr-mb-0 font-bold">
                  {partner.url ? (
                    <a href={partner.url} target="_blank" rel="noopener noreferrer" title={`${partner.name} - nouvelle fenêtre`} className="text-title-grey bg-none!">
                      {partner.name}
                    </a>
                  ) : (
                    partner.name
                  )}
                </p>
                <p className="fr-mb-0 fr-text--sm fr-text--mention-grey">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
