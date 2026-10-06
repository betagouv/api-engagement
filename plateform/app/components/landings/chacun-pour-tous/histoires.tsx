import { Link } from "react-router";

import Histoire1Webp from "~/assets/images/landings/chacun-pour-tous/histoire-1.webp";
import Histoire2Webp from "~/assets/images/landings/chacun-pour-tous/histoire-2.webp";
import Histoire3Webp from "~/assets/images/landings/chacun-pour-tous/histoire-3.webp";
import Histoire4Webp from "~/assets/images/landings/chacun-pour-tous/histoire-4.webp";
import AscPng from "~/assets/images/logo/asc-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import Carousel from "~/components/ui/carousel";
import Highlight from "~/components/ui/highlight";
import type { LandingCta } from "~/services/tracking/types";

const HISTOIRES = [
  {
    image: Histoire1Webp,
    domain: "Prévention et protection",
    story: "Quentin participe à des missions de sécurité et de secours aux côtés de l'armée, depuis 8 mois",
    publisher: "Les réserves des armées",
    logo: RocPng,
  },
  {
    image: Histoire2Webp,
    domain: "Solidarité",
    story: "Seb améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisher: "Service Civique",
    logo: AscPng,
  },
  { image: Histoire3Webp, domain: "Prévention et protection", story: "Marie, pompier 2 fois par semaine depuis 7 mois", publisher: "Sapeurs-pompiers volontaires", logo: SpvPng },
  {
    image: Histoire4Webp,
    domain: "Éducation pour tous",
    story: "Adrien accompagne des mineurs étrangers vers la réussite de leur apprentissage depuis 9 mois",
    publisher: "JeVeuxAider.gouv.fr",
    logo: JvaPng,
  },
];

export default function Histoires({ cta }: { cta: LandingCta }) {
  return (
    // `overflow-x-clip` : le carrousel dépasse jusqu'au bord de l'écran, sans créer de scroll horizontal.
    <section className="overflow-x-clip">
      <div className="fr-container">
        <div className="bg-brown-cafe-creme-975 @container mx-[calc(50%-50vw)] px-4 py-6 md:mx-0 md:px-6 md:py-14! lg:px-24">
          <h2 className="fr-h1 mb-4!">
            Des histoires vraies qui donnent
            <br className="hidden md:block" /> <Highlight className="bg-[#9ef9be] dark:bg-transparent">envie d'agir</Highlight>
          </h2>
          <p className="fr-text--lead mb-4! md:mb-6! lg:mb-8!">
            À ceux qui votent, qui laissent passer les piétons, qui sourient aux bébés, à celles qui donnent du temps à une cause, qui portent les cartons du voisin… À tous ceux
            qui prennent part sans le savoir : MERCI
            <span aria-hidden="true">🔥</span>
          </p>

          <Carousel
            squareArrows
            label="Histoires de personnes engagées"
            previousLabel="Voir les histoires précédentes"
            nextLabel="Voir les histoires suivantes"
            // Débord jusqu'aux bords de l'écran des deux côtés : la marge négative (50vw - 50cqw, soit l'écart entre
            // le bandeau et le bord de l'écran) est compensée par un padding identique, donc les cartes restent
            // alignées sur le titre. `cqw` (le bandeau est un conteneur) plutôt que `%`, que `scroll-padding`
            // calculerait sur la liste elle-même.
            listClassName="ml-[calc(50cqw-50vw)]! mr-[calc(50cqw-50vw)]! pl-[calc(50vw-50cqw)]! pr-[calc(50vw-50cqw)]! scroll-pl-[calc(50vw-50cqw)]!"
            itemClassName="w-[85vw] max-w-82 md:w-82"
            action={
              <Link to={cta.to} onClick={cta.onClick} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:w-auto!">
                {cta.label}
              </Link>
            }
          >
            {HISTOIRES.map((histoire) => (
              <div key={histoire.story} className="border-border-default-grey bg-background shadow-card flex h-full flex-col border">
                <img src={histoire.image} alt="" loading="lazy" className="h-59 w-full object-cover" />
                <div className="flex flex-1 flex-col gap-3 px-6 py-4">
                  <span className="bg-blue-france-950 text-blue-france-sun w-fit rounded-xl px-2 text-sm font-bold">{histoire.domain}</span>
                  <p className="text-title-grey mb-0!">{histoire.story}</p>
                  <p className="text-mention-grey mt-auto mb-0! flex items-center gap-2 text-xs">
                    <img src={histoire.logo} alt="" className="size-8 bg-white object-contain" />
                    {histoire.publisher}
                  </p>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
