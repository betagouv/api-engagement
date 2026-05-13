import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import SpvPng from "~/assets/images/spv-logo.png";

type Partner = {
  name: string;
  description: string;
  url: string;
  logo: string;
};

const PARTNERS: Partner[] = [
  {
    name: "Les réserves des armées",
    description: "Des missions rémunérées de réservistes.",
    url: "https://www.reservistes.defense.gouv.fr",
    logo: RocPng,
  },
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    url: "https://www.jeveuxaider.gouv.fr",
    logo: JvaPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général rémunérées.",
    url: "https://www.service-civique.gouv.fr",
    logo: AscPng,
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    url: "https://www.pompiers.fr",
    logo: SpvPng,
  },
];

export default function Partners({ style = "default" }: { style?: "default" | "compact" }) {
  return (
    <section className="bg-beige-gris-galet-975">
      <div className={`fr-container ${style === "compact" ? "fr-py-4w max-w-7xl!" : "fr-py-8w"}`}>
        <h2 className="fr-h2 fr-mb-2w">Il y a plein d'autres missions…</h2>
        <p className="fr-mb-6w text-title-grey fr-text--lead">…directement sur les sites qui les proposent, jettes-y un coup d'oeil !</p>

        <div className={`${style === "compact" ? "flex items-start justify-between gap-2" : "grid grid-cols-1 gap-4 md:grid-cols-2"}`}>
          {PARTNERS.map((partner) => (
            <div key={partner.name} className={`flex items-start gap-2 ${style === "compact" ? "flex-1" : "gap-4"}`}>
              <div className="flex items-center justify-center bg-white rounded-sm p-1">
                <img src={partner.logo} className="size-10 shrink-0 rounded object-contain" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="fr-mb-0 font-bold">
                  <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-title-grey bg-none!">
                    {partner.name}
                  </a>
                </p>
                <p className="fr-mb-0 fr-text--sm fr-text--mention-grey">{partner.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
