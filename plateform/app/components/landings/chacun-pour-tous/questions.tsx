import EnvironmentSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/environment.svg?url";
import HumanCooperationSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/human-cooperation.svg?url";
import CommunitySvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/community.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import { Link } from "react-router";

import Highlight from "~/components/ui/highlight";

const QUESTIONS = [
  {
    icon: EnvironmentSvg,
    question: "Comment avoir vraiment de l'impact, et pas juste en parler\u00a0?",
    answer: "Parce qu'agir, même à petite échelle, change tout, pour toi et pour les autres.",
  },
  { icon: CommunitySvg, question: "Comment rejoindre une communauté qui a du sens\u00a0?", answer: "Rencontre des personnes qui, comme toi, veulent agir concrètement." },
  {
    icon: BackpackSvg,
    question: "Et ça compte pour mon parcours\u00a0?",
    answer: "Oui ! Chaque mission t'apporte des compétences, des connaissances, une idée plus claire de ce que tu veux faire.",
  },
  {
    icon: HumanCooperationSvg,
    question: "Chacun pour tous",
    answer: "Qu'on se le dise : nous sommes plus engagés que nous ne le croyons. 74 % des Français ont fait au moins un acte civique dans l'année.",
  },
];

export default function Questions() {
  return (
    <section className="fr-container flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-12">
      <div className="lg:max-w-107">
        <h2 className="fr-h2 mb-4!">
          Tu te poses les mêmes <Highlight className="bg-yellow-tournesol-925 dark:bg-transparent">questions ?</Highlight>
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
