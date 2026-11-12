import EnvironmentSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/environment.svg?url";
import HumanCooperationSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/human-cooperation.svg?url";
import CommunitySvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/community.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import { Link } from "react-router";

import Highlight from "~/components/ui/highlight";

const QUESTIONS = [
  {
    icon: HumanCooperationSvg,
    question: "«\u00a0Chacun pour tous\u00a0», c'est quoi\u00a0?",
    answer:
      "C'est la devise qui rassemble toutes les façons de participer à la vie collective et démocratique\u00a0: aider, transmettre, rejoindre une association, faire un Service Civique, voter… Concrètement, c'est un repère pour trouver plus facilement votre façon d'agir.",
  },
  {
    icon: EnvironmentSvg,
    question: "Comment avoir vraiment de l'impact, et pas juste en parler\u00a0?",
    answer: "En choisissant une mission concrète, près de chez vous ou ailleurs. Même à petite échelle, votre action est utile aux autres, et à vous aussi.",
  },
  { icon: CommunitySvg, question: "Comment rejoindre une communauté qui a du sens\u00a0?", answer: "Rencontrez des personnes qui, comme vous, veulent agir concrètement." },
  {
    icon: BackpackSvg,
    question: "Est-ce que cela compte pour votre parcours\u00a0?",
    answer: "Oui\u00a0! Chaque mission vous apporte des compétences, des connaissances, une idée plus claire de ce que vous voulez faire.",
  },
];

export default function Questions() {
  return (
    <section className="fr-container flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-12">
      <div className="lg:max-w-107">
        <h2 className="fr-h2 mb-4!">
          Vous vous posez les mêmes <Highlight className="bg-yellow-tournesol-925 dark:bg-transparent">questions ?</Highlight>
        </h2>
        <p className="fr-text--lg mb-0!">
          <Link to="/" className="fr-link fr-text--lg!">
            TrouveTaMission.gouv.fr
          </Link>{" "}
          est le service public numérique de l'engagement, accessible à tous, dès 16 ans. Cette plateforme oriente les envies d'agir des citoyens et des citoyennes vers les
          missions d'intérêt général.
        </p>
      </div>

      <ul role="list" className="m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-2 md:gap-x-11.5 md:gap-y-8 lg:max-w-163">
        {QUESTIONS.map((item) => (
          <li key={item.question} className="flex gap-2 p-0! md:flex-col">
            <div className="bg-blue-ecume-975 flex size-12 shrink-0 items-center justify-center rounded-full">
              <img src={item.icon} alt="" aria-hidden="true" className="size-8 dark:rounded-full dark:bg-white" />
            </div>
            <div>
              <h3 className="fr-h6 mb-2!">{item.question}</h3>
              <p className="mb-0!">{item.answer}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
