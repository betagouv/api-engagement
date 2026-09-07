import Temoignage1Jpg from "~/assets/images/defis-engagement-temoignage-1.jpg";
import Temoignage2Jpg from "~/assets/images/defis-engagement-temoignage-2.jpg";
import Temoignage3Jpg from "~/assets/images/defis-engagement-temoignage-3.jpg";
import DoubleQuotesSvg from "~/assets/svg/double-quotes.svg";

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
  role: "18 ans, bénévole pour Cosmos Arts à Vitry sur Seine",
};

const ELODIE = {
  quote: "Cette expérience m'a permis de reprendre confiance dans mon projet professionnel dans le social alors que j'allais l'abandonner. J'ai vécu des moments très forts.",
  name: "Elodie",
  role: "Bénévole auprès d'une association accueillant des femmes et enfants maltraités",
};

function Temoignage({ quote, name, role, className = "" }: { quote: string; name: string; role: string; className?: string }) {
  return (
    <figure className={`bg-blue-france-975 border-border-default-grey m-0! flex flex-col gap-6 rounded-2xl border p-8 ${className}`}>
      <img src={DoubleQuotesSvg} alt="" aria-hidden="true" className="size-8" />
      <blockquote className="fr-text--lg text-default-grey m-0! p-0!">{quote}</blockquote>
      <figcaption className="text-mention-grey">
        <span className="block font-bold mb-4!">{name}</span>
        {role}
      </figcaption>
    </figure>
  );
}

export default function Histoires({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="fr-container fr-mb-8w">
      <h2 className="fr-h1 fr-mb-6w text-center">
        Des histoires vraies
        <br />
        qui donnent envie d'agir
      </h2>

      {/* Mosaïque : 1 colonne sur mobile, 2 sur tablette (la 3e colonne passe en pleine largeur), 3 sur desktop. */}
      <div className="fr-mb-6w grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Temoignage {...NACIM} />
          {/* Sur tablette les deux colonnes sont étirées à la même hauteur : la photo absorbe l'espace restant. */}
          <img
            src={Temoignage1Jpg}
            alt=""
            loading="lazy"
            className="h-[235px] w-full rounded-2xl object-cover md:h-auto md:min-h-[235px] md:flex-1 lg:h-[235px] lg:min-h-0 lg:flex-none"
          />
        </div>
        {/* Sur mobile la maquette place le témoignage avant la photo, l'inverse à partir de la tablette. */}
        <div className="flex flex-col-reverse gap-6 md:flex-col">
          <img
            src={Temoignage2Jpg}
            alt=""
            loading="lazy"
            className="h-[414px] w-full rounded-2xl object-cover md:h-auto md:min-h-[414px] md:flex-1 lg:h-[414px] lg:min-h-0 lg:flex-none"
          />
          <Temoignage {...VICTORIA} />
        </div>
        <div className="flex flex-col gap-6 md:col-span-2 md:flex-row lg:col-span-1 lg:flex-col">
          <Temoignage {...ELODIE} />
          <img src={Temoignage3Jpg} alt="" loading="lazy" className="hidden h-[235px] w-full rounded-2xl object-cover md:block md:w-1/2 lg:w-full" />
        </div>
      </div>

      <div className="flex justify-center">
        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg justify-center">
          Trouve ta mission
        </button>
      </div>
    </section>
  );
}
