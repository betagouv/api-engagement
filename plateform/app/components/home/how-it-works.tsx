import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import Carousel from "~/components/ui/carousel";

import Highlight from "../ui/highlight";

type Feature = {
  icon: string;
  title: string;
};

const FEATURES: Feature[] = [
  { icon: CalendarSvg, title: "À ton rythme, mission ponctuelle ou régulière." },
  { icon: MoneySvg, title: "Avec ou sans indemnité selon la mission." },
  { icon: LocationFranceSvg, title: "En France. Près de chez toi ou plus loin." },
  { icon: SelfTrainingSvg, title: "Sans diplôme ni expérience requis." },
];

export default function HowItWorks({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="fr-container relative z-10 flex flex-col lg:items-center gap-2 lg:gap-8 py-8 md:py-12 lg:py-16">
      <div className="mx-auto! text-center">
        <h2 className="fr-h1 mx-auto max-w-2xl">
          Tous les engagements publics, réunis en <Highlight className="bg-yellow-tournesol-925">un seul endroit</Highlight>
        </h2>
        <p className="fr-text--lead fr-mb-0 hidden md:block">Il existe plein de façons de s'engager, selon tes besoins et tes disponibilités.</p>
      </div>

      <Carousel
        label="Tous les engagements publics, réunis en un seul endroit"
        previousLabel="Voir précédent"
        nextLabel="Voir suivant"
        listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]! md:mx-0! md:px-0! md:scroll-px-0! md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4"
        itemClassName="w-[80vw] md:w-auto"
      >
        {FEATURES.map((feature) => (
          <div key={feature.icon} className="bg-background flex h-full flex-col items-center gap-4 p-8 text-center shadow-tile md:p-10 lg:mx-auto lg:max-w-60 lg:p-6">
            <img src={feature.icon} alt="" className="size-16 dark:box-content dark:rounded-full dark:bg-white dark:p-3" aria-hidden="true" />
            <h3 className="fr-text--lead text-title-grey font-bold">{feature.title}</h3>
          </div>
        ))}
      </Carousel>

      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full justify-center md:w-auto">
          Trouver ma mission
        </button>
        <p className="fr-text--sm text-mention-grey fr-mb-0! text-center!">+25 000 missions disponibles partout en France</p>
      </div>
    </section>
  );
}
