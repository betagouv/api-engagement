import { Link } from "react-router";

import TtmLogoSvg from "~/assets/svg/ttm-logo.svg";
import { SERVICE_TAGLINE, SERVICE_TITLE } from "~/components/layout/header";
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
      <div className="fr-header__body">
        <div className="fr-container">
          <div className="fr-header__body-row">
            <div className="fr-header__brand">
              <div className="fr-header__brand-top">
                <div className="fr-header__logo">
                  <p className="fr-logo">
                    République
                    <br />
                    Française
                  </p>
                </div>
                <div className="fr-header__operator">
                  <img src={TtmLogoSvg} alt="Trouve ta mission" className="w-24 lg:w-[149px]" />
                </div>
              </div>
              <div className="fr-header__service">
                <Link to="/" title={`Accueil — ${SERVICE_TITLE}`}>
                  <p className="fr-header__service-title">{SERVICE_TITLE}</p>
                </Link>
                <p className="fr-header__service-tagline">{SERVICE_TAGLINE}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Progression du quiz"
        aria-valuemin={0}
        aria-valuemax={stepCount}
        aria-valuenow={step}
        aria-valuetext={`Étape ${step} sur ${stepCount}`}
        className="h-2 bg-beige-gris-galet"
      >
        <span className="sr-only">{`Étape ${step} sur ${stepCount}`}</span>
        <div className="h-full bg-blue-france-sun transition-[width] ease-out duration-500" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
