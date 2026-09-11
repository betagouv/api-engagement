import MentalDisabilitiesSvg from "@gouvfr/dsfr/dist/artwork/pictograms/accessibility/mental-disabilities.svg?url";
import EnvironmentSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/environment.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import { Link } from "react-router";

import Carousel from "~/components/ui/carousel";
import { trackCtaClicked } from "~/services/tracking/events";

const MISSIONS_CTA_PATH = "/missions?tranche_age=moins_18_ans";
const MISSIONS_CTA_LABEL = "Voir toutes les missions";

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

export default function Questions() {
  return (
    <section className="fr-container">
      <h2 className="fr-h1 fr-mb-6w text-center">Tu te poses les mêmes questions ?</h2>

      <Carousel
        label="Les questions que tu te poses"
        previousLabel="Voir la question précédente"
        nextLabel="Voir la question suivante"
        listClassName="md:mx-0! md:px-0! md:scroll-px-0! md:grid md:grid-cols-3 lg:gap-13"
        itemClassName="w-[82vw] max-w-[320px] md:w-auto md:max-w-none"
        action={
          <Link
            to={MISSIONS_CTA_PATH}
            onClick={() =>
              trackCtaClicked({
                pageName: "landing_defis_engagement",
                ctaSection: "questions",
                ctaLabel: MISSIONS_CTA_LABEL,
                ctaDestination: "missions_list",
                destinationPath: MISSIONS_CTA_PATH,
              })
            }
            className="fr-btn fr-btn--secondary fr-btn--lg justify-center"
          >
            {MISSIONS_CTA_LABEL}
          </Link>
        }
      >
        {QUESTIONS.map((item) => (
          <div key={item.question} className="bg-blue-france-950 border-border-default-grey flex h-full flex-col gap-2! rounded-2xl! border p-6!">
            <div className="bg-background fr-mb-1w flex size-20 items-center justify-center rounded-full md:size-24">
              <img src={item.icon} alt="" aria-hidden="true" className="size-[60px] md:size-[72px] dark:rounded-full dark:bg-white" />
            </div>
            <h3 className="fr-h6 mb-0!">{item.question}</h3>
            <p className="fr-text--lg mb-0!">{item.answer}</p>
          </div>
        ))}
      </Carousel>
    </section>
  );
}
