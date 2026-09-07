import AscLogo from "~/assets/images/asc-logo.png";
import RocLogo from "~/assets/images/roc-logo.png";
import SpvLogo from "~/assets/images/spv-logo.png";
import Carousel from "~/components/ui/carousel";

import Highlight from "../ui/highlight";

type Testimonial = {
  id: string;
  image: string;
  domain: string;
  skillIcon: string;
  skill: string;
  title: string;
  publisherName: string;
  publisherLogo: string;
};

import TestimonialAdrien from "~/assets/images/testimonial-adrien.jpg";
import TestimonialMarie from "~/assets/images/testimonial-marie.jpg";
import TestimonialSeb from "~/assets/images/testimonial-seb.jpg";
import TestimonialSophie from "~/assets/images/testimonial-sophie.jpg";

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    image: TestimonialSophie,
    domain: "Sécurité",
    skillIcon: "❤️",
    skill: "Aider les autres",
    title: "Sophie, infirmière 2 fois par semaine depuis 3 mois",
    publisherName: "La réserve des armées",
    publisherLogo: RocLogo,
  },
  {
    id: "2",
    image: TestimonialSeb,
    domain: "Solidarité",
    skillIcon: "💡",
    skill: "Développe tes...",
    title: "Séb, améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "3",
    image: TestimonialAdrien,
    domain: "Solidarité",
    skillIcon: "💡",
    skill: "Développe tes...",
    title: "Adrien, accompagne des mineurs étrangers vers la réussite de leur apprentissage depuis 9 mois",
    publisherName: "Service Civique",
    publisherLogo: AscLogo,
  },
  {
    id: "4",
    image: TestimonialMarie,
    domain: "Sécurité",
    skillIcon: "❤️",
    skill: "Aider les autres",
    title: "Marie, pompier 2 fois par semaine depuis 7 mois",
    publisherName: "Sapeurs-pompiers volontaires",
    publisherLogo: SpvLogo,
  },
];

export default function Testimonials({ onStartQuiz }: { onStartQuiz: () => void }) {
  // `overflow-x-clip` : les cartes débordent du bandeau jusqu'au bord de l'écran, sans scroll horizontal
  // (`50vw` inclut la barre de défilement, contrairement à la largeur du document).
  return (
    <section className="fr-container overflow-x-clip">
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

        <Carousel
          label="Témoignages d'engagés"
          previousLabel="Voir les témoignages précédents"
          nextLabel="Voir les témoignages suivants"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]!"
          itemClassName="w-[80vw] max-w-[330px] md:w-[330px]"
          action={
            <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary w-full! justify-center md:w-auto!">
              Je veux trouver ma mission
            </button>
          }
        >
          {TESTIMONIALS.map((testimonial) => (
            <article key={testimonial.id} className="bg-background flex h-full flex-col shadow-sm">
              <img src={testimonial.image} alt="" loading="lazy" className="block h-[280px] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-france-950 text-blue-france-sun inline-flex items-center rounded-full px-2 text-sm font-bold">{testimonial.domain}</span>
                  <span className="bg-blue-france-950 text-blue-france-sun inline-flex items-center gap-1 rounded-full px-2 text-sm font-bold">
                    <span aria-hidden="true">{testimonial.skillIcon}</span>
                    {testimonial.skill}
                  </span>
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
        </Carousel>
      </div>
    </section>
  );
}
