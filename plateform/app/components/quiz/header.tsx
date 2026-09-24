import { Link } from "react-router";

import TtmLogoSvg from "~/assets/svg/ttm-logo.svg";
import ExitModal from "./exit-modal";

interface QuizHeaderProps {
  step: number;
  stepCount: number;
  backHref?: string;
  onBack?: () => void;
}

export default function QuizHeader({ step = 0, stepCount, backHref, onBack }: QuizHeaderProps) {
  const progress = stepCount > 0 ? Math.min(100, Math.max(0, (step / stepCount) * 100)) : 0;

  return (
    <header role="banner" className="fr-header filter-none! relative">
      <ExitModal className="fr-icon-close-line text-blue-france-sun! absolute top-2 right-4 p-2 z-10 hidden lg:block" />
      <div className="fr-header__body hidden lg:block">
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
                  <Link to="/" title="Accueil — Trouve ta mission">
                    <img src={TtmLogoSvg} alt="Trouve ta mission" className="w-[149px]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex lg:hidden items-center px-4 h-14">
        {backHref && (
          <Link to={backHref} onClick={onBack} title="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-semi-bold!">
            Retour
          </Link>
        )}
        <Link to="/" title="Accueil — Trouve ta mission" className="absolute left-1/2 -translate-x-1/2">
          <img src={TtmLogoSvg} alt="Trouve ta mission" className="h-10 w-[72px]" />
        </Link>
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
