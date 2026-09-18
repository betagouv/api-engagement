import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";

import Highlight from "../ui/highlight";

type Feature = {
  icon: string;
  title: string;
};

const FEATURES: Feature[] = [
  { icon: CalendarSvg, title: "À ton rythme, mission ponctuelle ou régulière." },
  { icon: MoneySvg, title: "Avec ou sans indemnité selon la mission." },
  { icon: LocationFranceSvg, title: "En France. Près de chez toi ou plus loin." },
  { icon: SelfTrainingSvg, title: "Sans diplôme ni expérience requis." },
];

export default function HowItWorks({ onStartQuiz }: { onStartQuiz: () => void }) {
  // Deux mises en page pour une même liste : sur mobile une suite de lignes « pastille + texte » alignées à
  // gauche, à partir de `md` la grille de tuiles centrées. Le DSFR pose `content` sur `li::marker`, d'où le
  // `marker:content-none!`.
  return (
    <section className="fr-container relative z-10 flex flex-col gap-4 py-8 md:py-12 lg:items-center lg:gap-8 lg:py-16">
      <div className="md:mx-auto! md:text-center">
        <h2 className="fr-h1 mb-0! md:mx-auto md:mb-3! md:max-w-2xl">
          Tous les engagements publics, réunis en <Highlight className="bg-yellow-tournesol-925">un seul endroit</Highlight>
        </h2>
        <p className="fr-text--lead fr-mb-0 hidden md:block">Il existe plein de façons de s'engager, selon tes besoins et tes disponibilités.</p>
      </div>

      <ul role="list" className="list-none! mt-6! mb-0! flex w-full flex-col gap-4 p-0! md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.icon}
            className="list-none! marker:content-none! flex items-center gap-2 md:bg-background md:h-full md:flex-col md:gap-4 md:p-10 md:text-center md:shadow-tile lg:mx-auto lg:max-w-60 lg:p-6!"
          >
            <span className="bg-blue-ecume-975 flex size-12 shrink-0 items-center justify-center rounded-3xl md:size-16 md:rounded-none md:bg-transparent">
              <img src={feature.icon} alt="" className="size-8 md:size-16 md:dark:box-content md:dark:rounded-full md:dark:bg-white md:dark:p-3" aria-hidden="true" />
            </span>
            <h3 className="text-[20px]! leading-7! text-default-grey fr-mb-0 font-bold">{feature.title}</h3>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 md:items-center">
        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:w-auto!">
          Trouver ma mission
        </button>
        <p className="fr-text--sm text-mention-grey fr-mb-0! text-center!">+25 000 missions disponibles partout en France</p>
      </div>
    </section>
  );
}
