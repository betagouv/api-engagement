import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import MissionTag from "~/components/missions/mission-tag";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { MissionDetailNavState } from "~/services/tracking/types";
import { formatCompensation } from "~/utils/mission";
import { getScrollBehavior } from "~/utils/motion";

// Tags bleus de la carte (cf. maquette : lieu, rythme, indemnité) construits depuis les champs browse.
const buildTags = (mission: MissionBrowse): string[] => {
  const location = mission.remote === "local" ? "Près de chez moi" : mission.remote === "full" ? "À distance" : mission.city;
  const compensation = mission.compensation ? formatCompensation(mission.compensation) : null;
  return [location, mission.schedule, compensation].filter((tag): tag is string => Boolean(tag));
};

export default function Missions({ missions, onStartQuiz }: { missions: MissionBrowse[]; onStartQuiz: () => void }) {
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
    const offset = direction === "left" ? -329 : 329;
    scrollRef.current.scrollBy({ left: offset, behavior: getScrollBehavior() });
  };

  if (!missions.length) return null;

  return (
    <section className="bg-yellow-moutarde-975 fr-py-8w fr-mb-8w" aria-roledescription="carousel" aria-label="Missions à ne pas louper">
      <div className="fr-container">
        <h2 className="fr-h1 mb-4!">Des missions à ne pas louper !</h2>
        <p className="fr-text--lead fr-mb-6w">
          Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre les missions qui te
          correspondent !
        </p>

        <div
          ref={scrollRef}
          id="defis-missions-carousel"
          onScroll={updateScrollState}
          className="fr-mb-4w snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:snap-none"
          aria-live="polite"
          aria-atomic="false"
        >
          <ul role="list" className="m-0! flex w-max list-none! items-stretch gap-6 p-0! pb-4">
            {missions.map((mission, index) => {
              const domainLabel = getDomainLabel(mission.domain);
              const cardImage = mission.photo ?? mission.organizationLogo ?? mission.domainLogo;

              return (
                <li
                  key={mission.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Mission ${index + 1} sur ${missions.length}`}
                  className="w-[80vw] max-w-[305px] shrink-0 snap-center md:w-[305px]"
                >
                  <div className="fr-enlarge-link border-border-default-grey bg-background shadow-card relative flex h-full w-full flex-col border">
                    {cardImage ? <img className="h-[120px] w-full object-cover" src={cardImage} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-[120px] w-full" />}

                    {domainLabel && <p className="fr-badge fr-badge--sm fr-badge--purple-glycine absolute top-3 left-3 z-1 m-0! px-[6px]! text-[12px]!">{domainLabel}</p>}

                    <div className="flex flex-1 flex-col gap-4 px-4 py-3">
                      <h3 className="m-0! text-[16px]! leading-tight!">
                        <Link
                          to={`/missions/${mission.id}`}
                          state={{ entrySource: "defis_engagement" } satisfies MissionDetailNavState}
                          onClick={() => trackMissionClickedFromBrowse(mission, { section: "defis_engagement", entryPage: "defis_engagement", opensExternal: false })}
                          className="text-title-grey! fr-h6! mb-0! bg-none!"
                          style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}
                        >
                          {mission.title}
                        </Link>
                      </h3>

                      <div className="flex flex-wrap content-start gap-2">
                        {buildTags(mission).map((tag) => (
                          <MissionTag key={tag}>{tag}</MissionTag>
                        ))}
                      </div>

                      {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
                      {mission.publisherName && (
                        <div className="text-mention-grey mt-auto flex items-center gap-2 text-xs">
                          {mission.publisherLogo && (
                            <img src={mission.publisherLogo} alt="" aria-hidden="true" className="h-8 max-w-20 rounded-lg bg-white object-contain" loading="lazy" />
                          )}
                          <span className="line-clamp-1">{mission.publisherName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Voir les missions précédentes"
              aria-controls="defis-missions-carousel"
              className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
            ></button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Voir les missions suivantes"
              aria-controls="defis-missions-carousel"
              className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
            ></button>
          </div>
          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full justify-center md:w-auto">
            Trouve ta mission
          </button>
        </div>
      </div>
    </section>
  );
}
