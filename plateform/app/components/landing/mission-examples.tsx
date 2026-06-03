import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { BrowseMission } from "~/types/api";

type Props = {
  missions: BrowseMission[];
  className?: string;
};

export default function MissionExamples({ missions, className }: Props) {
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
  }, [missions]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -380 : 380;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (!missions.length) return null;

  const domainValues = TAXONOMY.domaine.values as Record<string, { label: string }>;

  return (
    <section className={`fr-pb-8w relative z-10 ${className}`} aria-roledescription="carousel" aria-label="Exemples de missions d'engagement">
      <div className="fr-container relative">
        <div
          ref={scrollRef}
          id="missions-carousel"
          onScroll={updateScrollState}
          className="snap-x snap-mandatory md:snap-none overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)] md:ml-0"
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="flex w-max gap-4 px-[10vw] pb-4 md:pl-0 md:pr-8">
            {missions.map((mission, i) => {
              const domainLabel = mission.domain ? (domainValues[mission.domain]?.label ?? mission.domain) : null;
              const href = mission.applicationUrl ?? "#";
              return (
                <Link
                  key={mission.id}
                  to={href}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Mission ${i + 1} sur ${missions.length}`}
                  className="bg-background flex w-[80vw] max-w-[360px] shrink-0 snap-center overflow-hidden shadow-lg border border-border-default-grey underline-none! bg-none! hover:bg-background! md:w-[360px]"
                >
                  {mission.domainLogo ? (
                    <img src={mission.domainLogo} alt="" className="w-28 shrink-0 object-cover" loading="lazy" />
                  ) : (
                    <div className="bg-beige-gris-galet w-28 shrink-0" />
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {domainLabel && <p className="fr-text--xs w-fit px-2 bg-blue-france-950 text-blue-france-sun rounded-full font-medium mb-0!">{domainLabel}</p>}
                    <p className="fr-text--md text-title-grey fr-mb-0 line-clamp-2 font-bold">{mission.title}</p>
                    <div className="fr-mt-auto flex items-center gap-2">
                      {mission.publisherLogo && <img src={mission.publisherLogo} alt="" className="size-6 rounded object-contain" />}
                      {mission.publisherName && <span className="fr-text--xs text-mention-grey line-clamp-1">{mission.publisherName}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Voir les missions précédentes"
            aria-controls="missions-carousel"
            className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
          ></button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Voir les missions suivantes"
            aria-controls="missions-carousel"
            className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
          ></button>
        </div>

        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Voir les missions précédentes"
            aria-controls="missions-carousel"
            className="bg-background! text-title-grey absolute left-0 top-1/2 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md md:flex"
          >
            <span aria-hidden className="fr-icon-arrow-left-s-line" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Voir les missions suivantes"
            aria-controls="missions-carousel"
            className="bg-background! text-title-grey absolute right-0 top-1/2 hidden size-12 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full shadow-md md:flex"
          >
            <span aria-hidden className="fr-icon-arrow-right-s-line" />
          </button>
        )}
      </div>
    </section>
  );
}
