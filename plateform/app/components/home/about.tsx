import CommunitySvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/community.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import CompassSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/compass.svg?url";
import Highlight from "../ui/highlight";

type Benefit = {
  icon: string;
  title: string;
  body: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: BackpackSvg,
    title: "Ça compte pour mon parcours !",
    body: "Chaque mission t'apporte des compétences, des connaissances, une idée plus claire de ce que tu veux faire.",
  },
  {
    icon: CompassSvg,
    title: "Une vie pas boring du tout",
    body: "On t'aide à trouver où tes forces rencontrent les besoins du monde.",
  },
  {
    icon: CommunitySvg,
    title: "Rencontre du beau monde",
    body: "Découvre des personnes que tu n'aurais jamais croisées autrement et crée des liens.",
  },
];

export default function About() {
  return (
    <section className="fr-container py-6! md:py-12! px-6! flex flex-col gap-4 lg:flex-row lg:gap-24">
      <div className="w-full lg:w-[34%]">
        <h2 className="fr-h2 -pr-4">
          Qui est <Highlight className="bg-yellow-tournesol-925">TrouveTaMission.gouv.fr</Highlight> ?
        </h2>
        <p className="fr-text--lg text-default-grey fr-mb-0">
          TrouveTaMission.gouv.fr est le service public numérique de l'engagement, ouvert à tous, dès 16 ans. Cette plateforme oriente les envies d'agir des citoyens et des
          citoyennes vers les missions d'intérêt général.
        </p>
      </div>

      <div className="grid flex-1 mt-2! md:mt-0! grid-cols-1 gap-8 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex items-start gap-2 sm:flex-col">
            <div className="bg-blue-ecume-975 dark:bg-white flex size-12 shrink-0 items-center justify-center rounded-3xl">
              <img src={benefit.icon} alt="" className="size-8" aria-hidden="true" />
            </div>
            <div className="flex flex-col sm:gap-2">
              <h3 className="fr-h6 text-default-grey fr-mb-0">{benefit.title}</h3>
              <p className="fr-text--md text-default-grey fr-mb-0">{benefit.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
