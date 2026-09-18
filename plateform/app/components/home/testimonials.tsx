import AscLogo from "~/assets/images/logo/asc-logo.png";
import JvaLogo from "~/assets/images/logo/jva-logo.png";
import RocLogo from "~/assets/images/logo/roc-logo.png";
import SpvLogo from "~/assets/images/logo/spv-logo.png";

import TestimonialEducation from "~/assets/images/home/testimonial-education.webp";
import TestimonialMemory from "~/assets/images/home/testimonial-memory.webp";
import TestimonialPrevention1 from "~/assets/images/home/testimonial-prevention-1.webp";
import TestimonialPrevention2 from "~/assets/images/home/testimonial-prevention-2.webp";
import TestimonialPrevention3 from "~/assets/images/home/testimonial-prevention-3.webp";
import TestimonialSkill from "~/assets/images/home/testimonial-skill.webp";
import TestimonialSolidarity from "~/assets/images/home/testimonial-solidarity.webp";

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
    image: TestimonialPrevention1,
    domain: "Prévention et protection",
    title: "Quentin participe à des missions de sécurité et de secours aux côtés de l'armée, depuis 8 mois",
    publisherName: "La réserve des armées",
    publisherLogo: RocLogo,
  },
  {
    id: "2",
    image: TestimonialSolidarity,
    domain: "Solidarité",
    title: "Seb, améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "3",
    image: TestimonialPrevention2,
    domain: "Prévention et protection",
    title: "Marie, pompier 2 fois par semaine depuis 7 mois",
    publisherName: "Sapeurs pompiers volontaires",
    publisherLogo: SpvLogo,
  },
  {
    id: "4",
    image: TestimonialEducation,
    domain: "Éducation pour tous",
    title: "Adrien, accompagne des mineurs étrangers vers la réussite de leur apprentissage depuis 9 mois",
    publisherName: "JeVeuxAider.gouv.fr",
    publisherLogo: JvaLogo,
  },
  {
    id: "5",
    image: TestimonialMemory,
    domain: "Mémoire et citoyenneté",
    title: "Sarah, Je participe à des actions citoyennes et je découvre la gendarmerie depuis 9 mois",
    publisherName: "Gendarmerie nationale",
    publisherLogo: JvaLogo,
  },
  {
    id: "6",
    image: TestimonialSkill,
    domain: "Bénévolat de compétences",
    title: "Émilie accompagne des projets de communication pour des associations depuis 1 an",
    publisherName: "JeVeuxAider.gouv.fr",
    publisherLogo: JvaLogo,
  },
  {
    id: "7",
    image: TestimonialPrevention3,
    domain: "Prévention et protection",
    title: "Steve, participe aux collectes de vêtements depuis 7 mois",
    publisherName: "JeVeuxAider.gouv.fr",
    publisherLogo: JvaLogo,
  },
];

export default function Testimonials({ onStartQuiz }: { onStartQuiz: () => void }) {
  // `overflow-x-clip` : les cartes débordent du bandeau jusqu'au bord de l'écran, sans scroll horizontal
  // (`50vw` inclut la barre de défilement, contrairement à la largeur du document).
  // Sur mobile la carte active est centrée : la liste est étalée sur toute la largeur de l'écran et
  // `10vw` de part et d'autre laisse exactement la même amorce des deux côtés d'une carte en `80vw`.
  // À partir de `md`, on revient au calage à gauche sur le conteneur avec débord à droite.
  return (
    <section className="fr-container p-0!">
      <div className="bg-brown-cafe-creme-975 flex-col items-center gap-6 p-6 md:gap-6 md:px-6 lg:gap-8 lg:px-8 lg:py-20">
        <h2 className="fr-h2 text-center">
          Des histoires vraies qui donnent <Highlight className="bg-green-emeraude-925">envie d'agir</Highlight>
        </h2>
        <p className="text-sm leading-6 md:text-xl! md:leading-8! text-default-grey mx-auto fr-mb-0 text-left lg:text-center">
          Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre la mission qui
          correspond à <strong>ce qui t'anime</strong>.
        </p>

        <Carousel
          label="Témoignages d'engagés"
          previousLabel="Voir les témoignages précédents"
          nextLabel="Voir les témoignages suivants"
          listClassName="mx-[calc(50%-50vw)]! px-[10vw]! scroll-px-[10vw]! md:-ml-32! md:pr-4! md:pl-32! md:scroll-pr-4! md:scroll-pl-32!"
          itemClassName="w-[80vw] md:w-[330px]"
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
