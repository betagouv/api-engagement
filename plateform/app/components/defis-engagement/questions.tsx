import MentalDisabilitiesSvg from "@gouvfr/dsfr/dist/artwork/pictograms/accessibility/mental-disabilities.svg?url";
import EnvironmentSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/environment.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";

const QUESTIONS = [
  {
    icon: EnvironmentSvg,
    question: "Comment avoir vraiment de l'impact, et pas juste en parler",
    answer: "Parce qu'agir, même à petite échelle, change tout, pour toi et pour les autres.",
  },
  {
    icon: BackpackSvg,
    question: "Et ça compte pour mon parcours ?",
    answer: "Oui ! Chaque mission t'apporte des compétences, des connaissances, une idée plus claire de ce que tu veux faire.",
  },
  {
    icon: MentalDisabilitiesSvg,
    question: "Comment rejoindre une communauté qui a du sens ?",
    answer: "Rencontre des personnes qui, comme toi, veulent agir concrètement.",
  },
];

export default function Questions({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="fr-container fr-mb-8w">
      <h2 className="fr-h1 fr-mb-6w text-center">Tu te poses les mêmes questions ?</h2>

      <ul role="list" className="fr-mb-6w m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-3 lg:gap-13">
        {QUESTIONS.map((item) => (
          <li key={item.question} className="bg-blue-france-950 border-border-default-grey flex flex-col gap-2 rounded-2xl border p-6">
            <div className="bg-background fr-mb-1w flex size-24 items-center justify-center rounded-full">
              <img src={item.icon} alt="" aria-hidden="true" className="size-[72px] dark:rounded-full dark:bg-white" />
            </div>
            <h3 className="fr-h4 mb-0!">{item.question}</h3>
            <p className="fr-text--lg mb-0!">{item.answer}</p>
          </li>
        ))}
      </ul>

      <div className="flex justify-center">
        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full justify-center md:w-auto">
          Trouve ta mission
        </button>
      </div>
    </section>
  );
}
