import { Link } from "react-router";
import Highlight from "../ui/highlight";

type Benefit = {
  icon: string;
  title: string;
  body: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: "🧭",
    title: "Comment l'aider à se lancer sans le pousser dans une direction ?",
    body: "Parce qu'accompagner, c'est ouvrir des portes, pas les franchir à sa place.",
  },
  {
    icon: "🌱",
    title: "Comment lui permettre de rencontrer des pro et de construire son réseau ?",
    body: "Parce que les bonnes rencontres changent souvent tout à cet âge.",
  },
  {
    icon: "🚀",
    title: "Comment lui faire gagner une vraie expérience terrain ?",
    body: "Parce qu'on apprend vraiment en faisant.",
  },
];

export default function ProSpace() {
  return (
    <section className="fr-container py-6! md:py-12! px-6!">
      <p className="fr-text--lg font-medium text-default-grey fr-mb-0 md:fr-mb-3w text-center md:text-left max-w-sm!">Vous accompagnez des jeunes dans leur parcours ?</p>
      <div className="flex items-start flex-col md:flex-row gap-8 md:gap-16">
        <div className="w-full md:w-[40%]">
          <h2 className="fr-h1 fr-mb-0 md:fr-mb-3w text-center md:text-left">
            Un <Highlight className="bg-yellow-tournesol-925">outil concret</Highlight> pour les aider à avancer.
          </h2>
          <p className="fr-text--lead text-default-grey fr-mb-4w hidden! md:block!">
            Professionnels de l'éducation, conseillers, parents : orientez facilement les jeunes vers des missions adaptées à leurs envies et leur rythme.
          </p>
          <Link to="#" className="fr-btn fr-btn--secondary hidden! md:block!">
            Accéder aux ressources
          </Link>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-12 md:gap-8 sm:grid-cols-2 px-4! md:px-0!">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex flex-col items-center md:items-start gap-2">
              <div className="bg-yellow-tournesol-925 flex size-12 items-center justify-center rounded-full text-2xl">{benefit.icon}</div>
              <h5 className="fr-h5 fr-mb-0 text-default-grey text-center md:text-left">{benefit.title}</h5>
              <p className="fr-text--lead text-default-grey fr-mb-0 text-center md:text-left">{benefit.body}</p>
            </div>
          ))}
        </div>
        <Link to="#" className="fr-btn fr-btn--secondary block! md:hidden! w-full! text-center!">
          Accéder aux ressources
        </Link>
      </div>
    </section>
  );
}
