import { Link } from "react-router";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import NavyBachiSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/navy-bachi.svg?url";

interface HeroProps {
  onStartQuiz: () => void;
}

export default function Hero({ onStartQuiz }: HeroProps) {
  return (
    <section className="bg-beige-gris-galet-975 relative overflow-hidden">
      <div className="fr-container fr-py-8w lg:fr-py-12w">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="relative z-10">
            <h1 className="fr-display--xs lg:fr-display--sm text-title-grey">À chacun sa façon d'agir</h1>
            <p className="fr-text--lead text-title-grey fr-mb-4w">
              Donne du temps, des compétences, ou tente une nouvelle aventure : des missions d'engagement existent près de chez toi.
            </p>

            <div className="flex flex-col items-start gap-3">
              <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg">
                Commencer le quiz
              </button>
              <Link to="#" className="fr-link">
                Je crée mon compte
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="bg-blue-france-950 relative aspect-square w-full max-w-[480px] rounded-full" aria-hidden="true">
              <img src={FirefighterSvg} alt="" className="absolute top-4 left-1/3 size-20 lg:size-24" aria-hidden="true" />
              <img src={NavyBachiSvg} alt="" className="absolute top-1/3 right-4 size-20 lg:size-28" aria-hidden="true" />
              <img src={BackpackSvg} alt="" className="absolute right-1/4 bottom-6 size-24 lg:size-32" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
