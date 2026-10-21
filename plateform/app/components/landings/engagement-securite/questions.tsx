import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import PoliceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/police.svg?url";
import SuccessSvg from "@gouvfr/dsfr/dist/artwork/pictograms/system/success.svg?url";

import Carousel from "~/components/ui/carousel";
import Highlight from "~/components/ui/highlight";

const QUESTIONS = [
  {
    icon: PoliceSvg,
    question: "C'est vraiment comparable à la réserve Police ?",
    answer: "Non, et ce n'est pas le but. Ce sont des missions différentes, mais tout aussi concrètes, pour agir, secourir ou protéger.",
  },
  {
    icon: CalendarSvg,
    question: "Je peux quand même retenter la Police l'an prochain ?",
    answer: "Oui. Une mission d'engagement ne ferme aucune porte pour candidater à nouveau. Et c'est une expérience valorisable.",
  },
  {
    icon: SuccessSvg,
    question: "Combien de temps ça va me prendre ?",
    answer: "De quelques heures par semaine à plusieurs semaines par an, jamais un engagement à temps plein. Le rythme exact est indiqué sur chaque fiche !",
  },
];

export default function Questions() {
  return (
    <section className="fr-container">
      {/* Le carrousel ajoute 24px de marge interne au-dessus des cartes : mêmes écarts au titre qu'avant (24px mobile, 60px desktop). */}
      <h2 className="fr-h1 mb-0! text-center md:mb-9!">
        Vous vous posez sûrement <Highlight className="bg-[#9ef9be] dark:bg-transparent">ces questions</Highlight>
      </h2>

      {/* Mobile : carrousel ; à partir de la tablette, grille de 3 colonnes. */}
      <Carousel
        squareArrows
        label="Les questions que vous vous posez"
        previousLabel="Voir la question précédente"
        nextLabel="Voir la question suivante"
        // En grille plus rien ne défile : `overflow-visible` évite de rogner l'ombre des cartes sur les côtés.
        listClassName="md:mx-0! md:px-0! md:scroll-px-0! md:grid md:grid-cols-3 md:overflow-visible lg:gap-13"
        itemClassName="w-[82vw] max-w-[320px] md:w-auto md:max-w-none"
      >
        {QUESTIONS.map((item) => (
          <div key={item.question} className="shadow-tile flex h-full bg-[#faf9fc] dark:bg-transparent flex-col gap-2 p-6!">
            <div className="bg-background flex size-24 items-center justify-center rounded-full">
              <img src={item.icon} alt="" aria-hidden="true" className="size-18 dark:rounded-full dark:bg-white" />
            </div>
            <h3 className="fr-h6 mb-0!">{item.question}</h3>
            <p className="mb-0!">{item.answer}</p>
          </div>
        ))}
      </Carousel>
    </section>
  );
}
