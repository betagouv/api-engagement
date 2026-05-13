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
    <section className="fr-container fr-py-12w fr-px-6w">
      <p className="fr-text--lg font-medium text-default-grey fr-mb-3w">Il existe mille façons de s'engager</p>
      <div className="flex items-start gap-16">
        <div className="w-full md:w-[40%]">
          <h2 className="fr-h1 fr-mb-3w">
            Vous <Highlight className="bg-yellow-tournesol-925">accompagnez</Highlight> des jeunes ?
          </h2>
          <p className="fr-text--lead text-default-grey fr-mb-4w">
            Professionnels de l'éducation, conseillers, associations, parents ou tuteurs : cet outil vous aide à orienter facilement les jeunes vers des missions d'engagement
            adaptées à leurs envies, à leur rythme et à leur situation.
          </p>
          <a href="#" className="fr-btn fr-btn--secondary">
            Trouver des ressources
          </a>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex flex-col gap-2">
              <div className="bg-yellow-tournesol-925 flex size-12 items-center justify-center rounded-full text-2xl">{benefit.icon}</div>
              <h5 className="fr-h5 fr-mb-0">{benefit.title}</h5>
              <p className="fr-text--lead text-default-grey fr-mb-0">{benefit.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
