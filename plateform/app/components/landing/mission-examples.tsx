import { useEffect, useRef, useState } from "react";
import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import SpvPng from "~/assets/images/spv-logo.png";

type MissionExample = {
  id: string;
  image: string;
  category: string;
  action: string;
  title: string;
  publisherName: string;
  publisherLogo: string;
};

const MISSIONS: MissionExample[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=400&q=80",
    category: "Sécurité & défense",
    action: "Aide les autres",
    title: "Je deviens infirmier pompier volontaire",
    publisherName: "Sapeurs pompiers volontaires",
    publisherLogo: SpvPng,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=400&q=80",
    category: "Solidarité",
    action: "Développe tes compétences",
    title: "J'améliore la qualité de vie des personnes âgées",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=400&q=80",
    category: "Sécurité & défense",
    action: "Développe tes compétences",
    title: "Combattant des forces terrestres",
    publisherName: "La réserve des armées",
    publisherLogo: RocPng,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80",
    category: "Environnement",
    action: "Protège la nature",
    title: "Participe au nettoyage des plages",
    publisherName: "JeVeuxAider",
    publisherLogo: JvaPng,
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80",
    category: "Solidarité",
    action: "Aide les autres",
    title: "Distribuer des repas chauds aux personnes sans-abri",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
];

export default function MissionExamples() {
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
    const offset = direction === "left" ? -380 : 380;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="fr-pb-8w relative z-10" aria-roledescription="carousel" aria-label="Exemples de missions d'engagement">
      <div className="fr-container relative">
        <div
          ref={scrollRef}
          id="missions-carousel"
          onScroll={updateScrollState}
          className="overflow-x-auto"
          style={{ marginRight: "calc(50% - 50vw)" }}
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="flex w-max gap-4 pr-8">
            {MISSIONS.map((mission, i) => (
              <article
                key={mission.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Mission ${i + 1} sur ${MISSIONS.length}`}
                className="bg-background flex w-[360px] shrink-0 overflow-hidden rounded shadow-sm"
              >
                <img src={mission.image} alt="" className="w-28 shrink-0 object-cover" loading="lazy" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="fr-text--xs w-fit px-2 bg-blue-france-950 text-blue-france-sun rounded-full font-medium mb-0!">{mission.category}</p>
                  <p className="fr-text--xs w-fit px-2 bg-blue-france-950 text-blue-france-sun rounded-full font-medium mb-0!">{mission.action}</p>
                  <p className="fr-text--md text-title-grey fr-mb-0 line-clamp-2 font-bold">{mission.title}</p>
                  <div className="fr-mt-auto flex items-center gap-2">
                    <img src={mission.publisherLogo} alt="" className="size-6 rounded object-contain" />
                    <span className="fr-text--xs text-mention-grey line-clamp-1">{mission.publisherName}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Voir les missions précédentes"
            aria-controls="missions-carousel"
            className="bg-background! text-title-grey absolute left-0 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
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
            className="bg-background! text-title-grey absolute right-0 top-1/2 flex size-12 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full shadow-md"
          >
            <span aria-hidden className="fr-icon-arrow-right-s-line" />
          </button>
        )}
      </div>
    </section>
  );
}
