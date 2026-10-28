import SearchSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import { Link } from "react-router";

import Carousel from "~/components/ui/carousel";
import Highlight from "~/components/ui/highlight";
import type { LandingCta } from "~/services/tracking/types";

const ETAPES_VIE = [
  { icon: BackpackSvg, title: "Tu fais des études\u00a0?", points: ["Des missions dès 16 ans", "Pendant les week-ends et les vacances"] },
  { icon: SearchSvg, title: "Tu cherches un emploi\u00a0?", points: ["Une expérience pour rebondir", "Service Civique indemnisé"] },
  { icon: SelfTrainingSvg, title: "Tu travailles déjà\u00a0?", points: ["Quelques heures par mois", "Le soir ou les week-ends"] },
];

export default function EtapesVie({ onStartQuiz, cta }: { onStartQuiz: () => void; cta: LandingCta }) {
  return (
    <section className="fr-container">
      <h2 className="fr-h1 mb-4! text-center md:mb-8!">
        Une mission pour <Highlight className="bg-[#9ef9be] dark:bg-transparent">chaque étape de</Highlight> la vie
      </h2>

      <Carousel
        squareArrows
        label="Une mission pour chaque étape de la vie"
        previousLabel="Voir la carte précédente"
        nextLabel="Voir la carte suivante"
        listClassName="md:mx-0! md:px-0! md:scroll-px-0! md:grid md:grid-cols-3 md:overflow-visible"
        itemClassName="w-[70vw] max-w-66 md:w-auto md:max-w-none"
        // Le bouton « Voir toutes les missions » n'existe que dans la maquette mobile.
        action={
          <Link to={cta.to} onClick={cta.onClick} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:hidden!">
            {cta.label}
          </Link>
        }
      >
        {ETAPES_VIE.map((etape) => (
          <div key={etape.title} className="bg-background shadow-tile relative flex h-full flex-col items-start gap-4 p-6">
            <img src={etape.icon} alt="" aria-hidden="true" className="size-12 dark:rounded-full dark:bg-white" />
            <h3 className="fr-h5 mb-0!">{etape.title}</h3>
            <ul className="mb-0! list-disc! ps-6!">
              {etape.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {/* Vrai lien (soulignement DSFR, navigation) : `onStartQuiz` remplace la navigation pour réinitialiser le quiz et tracer le clic. */}
            <Link
              to="/quiz/age"
              onClick={(event) => {
                event.preventDefault();
                onStartQuiz();
              }}
              className="fr-link fr-icon-arrow-right-line fr-link--icon-right mt-auto!"
            >
              Trouver ma mission<span className="fr-sr-only"> : {etape.title}</span>
            </Link>
          </div>
        ))}
      </Carousel>
    </section>
  );
}
