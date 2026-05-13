import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import AscPng from "~/assets/images/asc-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import SpvPng from "~/assets/images/spv-logo.png";
import Highlight from "../ui/highlight";

type Testimonial = {
  id: string;
  image: string;
  category: string;
  action: string;
  title: string;
  publisherName: string;
  publisherLogo: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    category: "Sécurité",
    action: "❤️ Aider les autres",
    title: "Infirmière 2 fois par semaine depuis 3 mois",
    publisherName: "La réserve des armées",
    publisherLogo: RocPng,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    category: "Solidarité",
    action: "💡 Développe tes compétences",
    title: "Améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    category: "Solidarité",
    action: "💡 Développe tes compétences",
    title: "Améliore la qualité de vie des personnes isolées depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    category: "Solidarité",
    action: "❤️ Aider les autres",
    title: "Pompier 2 fois par semaine depuis 7 mois",
    publisherName: "Sapeurs pompiers volontaires",
    publisherLogo: SpvPng,
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
          <h2 className="fr-h1 fr-mb-3w">
            Ils se sont engagés. <Highlight className="bg-yellow-moutarde-850">Pourquoi pas toi ?</Highlight>
          </h2>
          <p className="fr-text--lead text-default-grey mx-auto max-w-3xl fr-mb-0 text-center">
            Accompagner un public en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays…
            <br />
            Découvre les missions qui correspondent à <strong>ce qui t'anime</strong>.
          </p>
        </div>

        <div
          ref={scrollRef}
          id="testimonials-carousel"
          onScroll={updateScrollState}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden fr-mb-6w"
          style={{ marginRight: "calc(50% - 50vw)" }}
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="flex w-max gap-6 pr-8 pb-4">
            {TESTIMONIALS.map((testimonial, i) => (
              <article
                key={testimonial.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Témoignage ${i + 1} sur ${TESTIMONIALS.length}`}
                className="bg-background flex w-[328px] shrink-0 flex-col overflow-hidden border border-[#ddd] shadow-sm"
              >
                <img src={testimonial.image} alt="" className="h-[235px] w-full object-cover" loading="lazy" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-france-950 text-blue-france-sun rounded-full px-2 text-sm font-bold">{testimonial.category}</span>
                    <span className="bg-blue-france-950 text-blue-france-sun rounded-full px-2 text-sm font-bold">{testimonial.action}</span>
                  </div>
                  <p className="text-title-grey fr-mb-0 flex-1 text-xl font-bold leading-7">{testimonial.title}</p>
                  <div className="flex items-center gap-2">
                    <img src={testimonial.publisherLogo} alt="" className="size-8 rounded object-contain" />
                    <span className="fr-text--xs text-mention-grey">{testimonial.publisherName}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Voir les témoignages précédents"
            aria-controls="testimonials-carousel"
            className="fr-btn fr-btn--secondary rounded-full fr-icon-arrow-left-line fr-icon--md"
          ></button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Voir les témoignages suivants"
            aria-controls="testimonials-carousel"
            className="fr-btn fr-btn--secondary rounded-full fr-icon-arrow-right-line fr-icon--md"
          ></button>
          <Link to="/missions" className="fr-btn fr-btn--secondary">
            Je veux trouver ma mission
          </Link>
        </div>
      </div>
    </section>
  );
}
