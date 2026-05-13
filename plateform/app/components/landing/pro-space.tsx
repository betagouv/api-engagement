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
    title: "Orienter facilement",
    body: "Accédez à une sélection de missions correspondant aux centres d'intérêt et aux disponibilités des jeunes.",
  },
  {
    icon: "🐝",
    title: "Découvrir des opportunités",
    body: "Trouvez rapidement des opportunités d'engagement locales ou à distance.",
  },
  {
    icon: "🚀",
    title: "Faciliter le passage à l'action",
    body: "Un parcours simple qui les guide pour trouver une mission qui leur correspond.",
  },
  {
    icon: "🌱",
    title: "Valoriser leur engagement",
    body: "Accompagnez-les dans des expériences utiles pour les autres et enrichissantes pour leur parcours.",
  },
];

export default function ProSpace() {
  return (
    <section className="fr-container py-6! md:py-12! px-6! md:px-6!">
      <p className="fr-text--lg font-medium text-default-grey fr-mb-0 md:fr-mb-3w text-center md:text-left">Il existe mille façons de s'engager</p>
      <div className="flex items-start flex-col md:flex-row gap-8 md:gap-16">
        <div className="w-full md:w-[40%]">
          <h2 className="fr-h1 fr-mb-0 md:fr-mb-3w text-center md:text-left">
            Vous <Highlight className="bg-yellow-tournesol-925">accompagnez</Highlight> des jeunes ?
          </h2>
          <p className="fr-text--lead text-default-grey fr-mb-4w hidden! md:block!">
            Professionnels de l'éducation, conseillers, associations, parents ou tuteurs : cet outil vous aide à orienter facilement les jeunes vers des missions d'engagement
            adaptées à leurs envies, à leur rythme et à leur situation.
          </p>
          <Link to="#" className="fr-btn fr-btn--secondary hidden! md:block!">
            Trouver des ressources
          </Link>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-8 sm:grid-cols-2 px-4! md:px-0!">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex flex-col items-center md:items-start gap-2">
              <div className="bg-yellow-tournesol-925 flex size-12 items-center justify-center rounded-full text-2xl">{benefit.icon}</div>
              <h5 className="fr-h5 fr-mb-0 text-default-grey">{benefit.title}</h5>
              <p className="fr-text--lead text-default-grey fr-mb-0 text-center md:text-left">{benefit.body}</p>
            </div>
          ))}
        </div>
        <Link to="#" className="fr-btn fr-btn--secondary block! md:hidden! w-full! text-center!">
          Trouver des ressources
        </Link>
      </div>
    </section>
  );
}
