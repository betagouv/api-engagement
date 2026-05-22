import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import AscLogo from "~/assets/images/asc-logo.png";
import RocLogo from "~/assets/images/roc-logo.png";
import SpvLogo from "~/assets/images/spv-logo.png";

import Highlight from "../ui/highlight";

type Testimonial = {
  id: string;
  image: string;
  domain: string;
  skill: string;
  title: string;
  publisherName: string;
  publisherLogo: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80",
    domain: "Sécurité",
    skill: "❤️ Aider les autres",
    title: "Infirmière 2 fois par semaine depuis 3 mois",
    publisherName: "La réserves des armées",
    publisherLogo: RocLogo,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    domain: "Solidarité",
    skill: "💡 Développe tes...",
    title: "Améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
    domain: "Solidarité",
    skill: "💡 Développe tes...",
    title: "Améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    domain: "Sécurité",
    skill: "❤️ Aider les autres",
    title: "Pompier 2 fois par semaine depuis 7 mois",
    publisherName: "Sapeurs pompiers volontaires",
    publisherLogo: SpvLogo,
  },
];

export default function Testimonials() {
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
    const offset = direction === "left" ? -352 : 352;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="fr-container" aria-roledescription="carousel" aria-label="Témoignages d'engagés">
      <div className="bg-yellow-moutarde-975 fr-py-8w px-8">
        <div className="flex flex-col items-center fr-mb-6w">
          <h2 className="fr-h1 mb-0! md:mb-3!">
            Ils ont trouvé leurs places. <Highlight className="bg-yellow-moutarde-850">Pourquoi pas toi ?</Highlight>
          </h2>
          <p className="fr-text--lead text-default-grey mx-auto max-w-5xl! fr-mb-0 text-center hidden! md:block!">
            Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre les missions qui
            correspondent à <strong>ce qui t'anime</strong>.
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
            {TESTIMONIALS.map((testimonial, i) => (
              <article
                key={testimonial.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Témoignage ${i + 1} sur ${TESTIMONIALS.length}`}
                className="bg-background w-[330px] shrink-0 flex flex-col shadow-sm"
              >
                <img src={testimonial.image} alt="" loading="lazy" className="block h-[280px] w-full object-cover" />
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-france-950 text-blue-france-sun inline-flex items-center rounded-full px-2 text-sm font-bold">{testimonial.domain}</span>
                    <span className="bg-blue-france-950 text-blue-france-sun inline-flex items-center rounded-full px-2 text-sm font-bold">{testimonial.skill}</span>
                  </div>
                  <h3 className="fr-h6 text-title-grey mb-0!">{testimonial.title}</h3>
                  <div className="flex items-center gap-3 fr-mt-auto pt-2">
                    <div className="h-6 w-auto rounded object-contain bg-white p-1">
                      <img src={testimonial.publisherLogo} alt="" className="h-full w-auto object-contain" />
                    </div>
                    <span className="text-mention-grey fr-text--xs mb-0!">{testimonial.publisherName}</span>
                  </div>
                </div>
              </article>
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
