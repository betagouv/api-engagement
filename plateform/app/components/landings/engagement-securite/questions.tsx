import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import PoliceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/police.svg?url";
import SuccessSvg from "@gouvfr/dsfr/dist/artwork/pictograms/system/success.svg?url";

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
      <h2 className="fr-h1 mb-6! text-center md:mb-15!">
        Vous vous posez sûrement <Highlight className="bg-[#9ef9be] dark:bg-transparent">ces questions</Highlight>
      </h2>

      <ul role="list" className="m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-3 lg:gap-13">
        {QUESTIONS.map((item) => (
          <li key={item.question} className="dark:border-border-default-grey flex border-[#e9e1f0] bg-[#faf9fc] dark:bg-transparent flex-col gap-2 rounded-2xl border p-6!">
            <div className="bg-background flex size-24 items-center justify-center rounded-full">
              <img src={item.icon} alt="" aria-hidden="true" className="size-18 dark:rounded-full dark:bg-white" />
            </div>
            <h3 className="fr-h6 mb-0!">{item.question}</h3>
            <p className="mb-0!">{item.answer}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
