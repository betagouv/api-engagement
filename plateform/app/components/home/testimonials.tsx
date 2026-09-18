import AscLogo from "~/assets/images/logo/asc-logo.png";
import JvaLogo from "~/assets/images/logo/jva-logo.png";
import RocLogo from "~/assets/images/logo/roc-logo.png";
import SpvLogo from "~/assets/images/logo/spv-logo.png";
import TestimonialAdrien from "~/assets/images/testimonial-adrien.jpg";
import TestimonialMarie from "~/assets/images/testimonial-marie.jpg";
import TestimonialQuentin from "~/assets/images/testimonial-quentin.jpg";
import TestimonialSeb from "~/assets/images/testimonial-seb.jpg";
import Carousel from "~/components/ui/carousel";

import Highlight from "../ui/highlight";

type Testimonial = {
  id: string;
  image: string;
  domain: string;
  title: string;
  publisherName: string;
  publisherLogo: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    image: TestimonialQuentin,
    domain: "Prévention et protection",
    title: "Quentin participe à des missions de sécurité et de secours aux côtés de l'armée, depuis 8 mois",
    publisherName: "La réserve des armées",
    publisherLogo: RocLogo,
  },
  {
    id: "2",
    image: TestimonialSeb,
    domain: "Solidarité",
    title: "Seb, améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "3",
    image: TestimonialMarie,
    domain: "Prévention et protection",
    title: "Marie, pompier 2 fois par semaine depuis 7 mois",
    publisherName: "Sapeurs pompiers volontaires",
    publisherLogo: SpvLogo,
  },
  {
    id: "4",
    image: TestimonialAdrien,
    domain: "Éducation pour tous",
    title: "Adrien, accompagne des mineurs étrangers vers la réussite de leur apprentissage depuis 9 mois",
    publisherName: "Je Veux Aider",
    publisherLogo: JvaLogo,
  },
];

export default function Testimonials({ onStartQuiz }: { onStartQuiz: () => void }) {
  // `overflow-x-clip` : les cartes débordent du bandeau jusqu'au bord de l'écran, sans scroll horizontal
  // (`50vw` inclut la barre de défilement, contrairement à la largeur du document).
  return (
    <section className="fr-container overflow-x-clip">
      <div className="bg-brown-cafe-creme-975 fr-py-8w px-8">
        <div className="flex flex-col items-center fr-mb-6w">
          <h2 className="fr-h1 mb-0! md:mb-3!">
            Des histoires vraies qui donnent <Highlight className="bg-green-emeraude-925">envie d'agir</Highlight>
          </h2>
          <p className="fr-text--lead text-default-grey mx-auto max-w-5xl! fr-mb-0 text-center hidden! md:block!">
            Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre la mission qui
            correspond à <strong>ce qui t'anime</strong>.
          </p>
        </div>

        <Carousel
          label="Témoignages d'engagés"
          previousLabel="Voir les témoignages précédents"
          nextLabel="Voir les témoignages suivants"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]!"
          itemClassName="w-[80vw] max-w-[330px] md:w-[330px]"
          action={
            <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary w-full! justify-center md:w-auto!">
              Trouver ma mission
            </button>
          }
        >
          {TESTIMONIALS.map((testimonial) => (
            <article key={testimonial.id} className="bg-background border border-border-default-grey shadow-tile flex h-full flex-col">
              <img src={testimonial.image} alt="" loading="lazy" className="block h-58.75 w-full object-cover" />
              <div className="flex flex-1 flex-col gap-3 px-6 py-4">
                <div>
                  <span className="bg-blue-france-950 text-blue-france-sun inline-flex items-center rounded-xl px-2 text-sm font-bold">{testimonial.domain}</span>
                </div>
                <h3 className="fr-text--md text-title-grey font-normal! mb-0!">{testimonial.title}</h3>
                <div className="flex items-center gap-2 fr-mt-auto pt-2">
                  <div className="size-7.5 shrink-0 rounded-lg bg-white p-0.5">
                    <img src={testimonial.publisherLogo} alt="" className="size-full object-contain" />
                  </div>
                  <span className="text-mention-grey fr-text--xs mb-0!">{testimonial.publisherName}</span>
                </div>
              </div>
            </article>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
