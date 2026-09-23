import { Link } from "react-router";

import DoubleQuotesSvg from "~/assets/svg/double-quotes.svg";
import Highlight from "~/components/ui/highlight";
import type { LandingCta } from "~/services/tracking/types";

const NACIM = {
  quote:
    "Ça m'a vraiment aidé avec le déménagement à refaire mon cercle social. Aujourd'hui j'ai de vraies amitiés, ça m'a redonné de la motivation et un nouvel entourage. Chez les pompiers, on doit savoir compter les uns sur les autres. Je recommande à tout le monde de faire une expérience de bénévolat !",
  name: "Nacim",
  role: "Bénévole à la Croix Blanche et Pompier volontaire",
};

const VICTORIA = {
  quote:
    "C'était ma première expérience de bénévolat, et sans doute l'une des plus marquantes ! J'ai eu la chance de contribuer à un projet enrichissant et de rencontrer des personnes inspirantes. C'était un réel plaisir de participer à ces événements qui ont su créer du lien social et promouvoir la culture. Je recommande fortement :)",
  name: "Victoria",
  role: "Bénévole pour Cosmos Arts à Vitry sur Seine",
};

const CAMILLE = {
  quote:
    "Ce Service Civique m'a offert la possibilité d'agir concrètement, à ma mesure, pour l'environnement. Il a redonné du sens à mes gestes et à mes valeurs, dans une société où l'individualisme nous étouffe trop souvent.",
  name: "Camille",
  role: "Volontaire à la LPO",
};

function Temoignage({ quote, name, role, className = "" }: { quote: string; name: string; role: string; className?: string }) {
  return (
    <figure className={`bg-blue-france-975 border-border-default-grey m-0! flex flex-col gap-6 rounded-2xl border p-3 md:p-4 lg:p-8 ${className}`}>
      <img src={DoubleQuotesSvg} alt="" aria-hidden="true" className="size-8" />
      <blockquote className="text-default-grey m-0! p-0!">{quote}</blockquote>
      <figcaption className="text-mention-grey fr-text--sm mb-0!">
        <span className="fr-text--lg block font-bold mb-2!">{name}</span>
        {role}
      </figcaption>
    </figure>
  );
}

export default function Histoires({ cta }: { cta: LandingCta }) {
  return (
    <section className="fr-container">
      <h2 className="fr-h1 fr-mb-6w text-center">
        Des histoires vraies
        <br />
        qui donnent <Highlight className="bg-[#fbe769] dark:bg-transparent">envie d'agir</Highlight>
      </h2>

      {/* Mosaïque en colonnes dont la répartition change à chaque palier :
          mobile 1 colonne (Nacim, photo, Victoria, photo, Camille, photo) ;
          tablette 2 colonnes (Nacim, photo, Victoria | photo, Camille, photo) ;
          desktop 3 colonnes (Nacim, photo | photo, Victoria | Camille, photo).
          Victoria change de colonne entre tablette et desktop : son bloc est rendu deux fois, un seul est affiché. */}
      <div className="fr-mb-6w grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Temoignage {...NACIM} />
          <img src={Temoignage1Jpg} alt="" loading="lazy" className="aspect-[2/1] w-full rounded-2xl object-cover" />
          <Temoignage {...VICTORIA} className="lg:hidden" />
        </div>

        <div className="flex flex-col gap-6 lg:contents">
          <div className="flex flex-col gap-6">
            <img src={Temoignage2Jpg} alt="" loading="lazy" className="h-[190px] w-full rounded-2xl object-cover object-[center_30%] md:h-[414px] lg:h-[366px]" />
            <Temoignage {...VICTORIA} className="hidden lg:flex" />
          </div>

          <div className="flex flex-col gap-6">
            <Temoignage {...CAMILLE} />
            <img src={Temoignage3Jpg} alt="" loading="lazy" className="aspect-[3/2] w-full rounded-2xl object-cover" />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Link to={cta.to} onClick={cta.onClick} className="fr-btn fr-btn--secondary fr-btn--lg justify-center">
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
