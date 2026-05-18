import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import MissionCard from "~/components/missions/mission-card";
import type { BrowseMission } from "~/types/api";
import Highlight from "../ui/highlight";

type Props = {
  missions: BrowseMission[];
};

export default function Testimonials({ missions }: Props) {
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
    const offset = direction === "left" ? -352 : 352;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (!missions.length) return null;

  return (
    <section className="fr-container" aria-roledescription="carousel" aria-label="Témoignages d'engagés">
      <div className="bg-yellow-moutarde-975 fr-py-8w px-8">
        <div className="flex flex-col items-center fr-mb-6w">
          <h2 className="fr-h1 mb-0! md:mb-3!">
            Ils se sont engagés. <Highlight className="bg-yellow-moutarde-850">Pourquoi pas toi ?</Highlight>
          </h2>
          <p className="fr-text--lead text-default-grey mx-auto max-w-3xl fr-mb-0 text-center hidden! md:block!">
            Accompagner un public en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays…
            <br />
            Découvre les missions qui correspondent à <strong>ce qui t'anime</strong>.
          </p>
        </div>

        <div
          ref={scrollRef}
          id="testimonials-carousel"
          onScroll={updateScrollState}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-0! md:mb-6!"
          style={{ marginRight: "calc(50% - 50vw)" }}
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="flex w-max gap-6 pr-8 pb-4 items-stretch">
            {missions.map((mission, i) => (
              <div key={mission.id} role="group" aria-roledescription="slide" aria-label={`Témoignage ${i + 1} sur ${missions.length}`} className="w-[330px] shrink-0">
                <MissionCard mission={mission} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Voir les témoignages précédents"
              aria-controls="testimonials-carousel"
              className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
            ></button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Voir les témoignages suivants"
              aria-controls="testimonials-carousel"
              className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
            ></button>
          </div>
          <Link to="/missions" className="fr-btn fr-btn--secondary w-full justify-center md:w-auto">
            Je veux trouver ma mission
          </Link>
        </div>
      </div>
    </section>
  );
}
