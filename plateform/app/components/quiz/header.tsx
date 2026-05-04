import { Link } from "react-router";
import ExitModal from "./exit-modal";

interface QuizHeaderProps {
  step: number;
  stepCount: number;
}

export default function QuizHeader({ step = 0, stepCount }: QuizHeaderProps) {
  const progress = stepCount > 0 ? Math.min(100, Math.max(0, (step / stepCount) * 100)) : 0;

  return (
    <header role="banner" className="fr-header filter-none! relative">
      <ExitModal className="fr-icon-close-line text-blue-france-sun! absolute top-2 right-4 p-2 z-10 hidden lg:block" />
      <div className="fr-container hidden lg:block">
        <div className="fr-header__body-row items-start">
          <div className="fr-enlarge-link hover:bg-raised-grey-hover -my-4 flex items-center">
            <div className="fr-header__brand-top">
              <div className="fr-header__logo">
                <p className="fr-logo">
                  République
                  <br />
                  Française
                </p>
              </div>
            </div>
            <div className="p-4 text-title-grey">
              <Link to="/" title="Trouve ta mission">
                <p className="fr-header__service-title">Trouve ta mission</p>
              </Link>
              <p className="fr-header__service-tagline">Service public pour trouver une mission d'engagement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex lg:hidden items-center px-4 h-14">
        <Link to="/" title="Retour à l'accueil" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-semi-bold!">
          Retour
        </Link>
        <p className="fr-h6 absolute left-1/2 -translate-x-1/2 mb-0">Trouve ta mission</p>
      </div>

      <div className="h-2 bg-beige-gris-galet">
        <div className="h-full bg-blue-france-sun transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
