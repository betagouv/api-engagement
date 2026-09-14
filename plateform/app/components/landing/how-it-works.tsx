import type React from "react";

import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import LeafSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/leaf.svg?url";
import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import LongTraceSvg from "~/assets/svg/long-trace.svg";
import Carousel from "~/components/ui/carousel";

import Highlight from "../ui/highlight";

type Feature = {
  icon: string;
  title: string | React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: CalendarSvg,
    title: (
      <>
        À ton rythme. <br />
        Mission ponctuelle ou régulière.
      </>
    ),
  },
  {
    icon: MoneySvg,
    title: (
      <>
        Avec ou sans indemnité
        <br /> selon les missions.
      </>
    ),
  },
  {
    icon: LocationFranceSvg,
    title: (
      <>
        En France.
        <br />
        Près de chez toi ou plus loin.
      </>
    ),
  },
  {
    icon: SelfTrainingSvg,
    title: <>Compatible sans diplôme, études ou emploi</>,
  },
];

export default function HowItWorks({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className=" fr-mb-12w relative overflow-x-clip">
      <img src={FirefighterSvg} alt="" className="hidden md:block absolute left-12 top-5 size-30 opacity-20 rotate-24" aria-hidden="true" />
      <img src={LeafSvg} alt="" className="hidden md:block absolute -right-10 top-3 size-40 opacity-20 -rotate-12" aria-hidden="true" />
      <img src={LongTraceSvg} alt="" className="hidden md:block absolute bottom-0 left-0 size-full opacity-30" aria-hidden="true" />
      <div className="fr-container relative z-10">
        <div className="text-center fr-mb-6w">
          <p className="fr-text--lg font-medium">Comment ça marche ?</p>
          <h2 className="fr-h1">
            Des missions qui <Highlight>s'adaptent à toi</Highlight>
          </h2>
          <p className="fr-text--lead fr-mb-0 hidden md:block">Il existe plein de façons de s'engager, selon tes besoins et tes disponibilités.</p>
        </div>

        <Carousel
          label="Des missions qui s'adaptent à toi"
          previousLabel="Voir précédent"
          nextLabel="Voir suivant"
          className="fr-mb-3w"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]! md:mx-0! md:px-0! md:scroll-px-0! md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4"
          itemClassName="w-[80vw] md:w-auto"
        >
          {FEATURES.map((feature) => (
            <div key={feature.icon} className="bg-background flex h-full flex-col items-center gap-4 p-8 text-center shadow-lg md:p-10 lg:mx-auto lg:max-w-60 lg:p-6">
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
      </div>
    </section>
  );
}
