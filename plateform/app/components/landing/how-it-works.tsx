import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import LeafSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/leaf.svg?url";
import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import LongTraceSvg from "~/assets/svg/long-trace.svg";

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
        À ton rythme <br />
        Ponctuel ou régulier
      </>
    ),
  },
  {
    icon: MoneySvg,
    title: (
      <>
        Avec ou sans indemnité
        <br /> selon les missions
      </>
    ),
  },
  {
    icon: LocationFranceSvg,
    title: (
      <>
        En France
        <br />
        Près de chez toi ou plus loin
      </>
    ),
  },
  { icon: SelfTrainingSvg, title: "Compatible sans diplôme études ou emploi" },
];

export default function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

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

        <div
          ref={scrollRef}
          id="how-it-works-carousel"
          onScroll={updateScrollState}
          className="snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible fr-mb-6w [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] md:mx-0"
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="flex w-max gap-6 px-[10vw] pb-4 md:grid md:w-auto md:grid-cols-2 md:px-0 md:pb-0 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.icon}
                className="bg-background flex w-[80vw] shrink-0 snap-center flex-col items-center gap-4 p-6 text-center shadow-lg md:mx-auto md:w-auto md:max-w-60"
              >
                <img src={feature.icon} alt="" className="size-16 dark:box-content dark:rounded-full dark:bg-white dark:p-3" aria-hidden="true" />
                <p className="fr-text--lead text-title-grey font-bold mb-0!">{feature.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="fr-mb-3w flex justify-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Voir précédent"
            aria-controls="how-it-works-carousel"
            className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
          ></button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Voir suivant"
            aria-controls="how-it-works-carousel"
            className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
          ></button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link to="/quiz" className="fr-btn fr-btn--secondary fr-btn--lg w-full justify-center md:w-auto">
            Je découvre les missions
          </Link>
          <p className="fr-text--sm text-mention-grey fr-mb-0! text-center!">+25 000 missions disponibles partout en France</p>
        </div>
      </div>
    </section>
  );
}
