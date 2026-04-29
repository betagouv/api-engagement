import { Link } from "react-router";

interface QuizHeaderProps {
  step: number;
  stepCount: number;
}

export default function QuizHeader({ step = 0, stepCount }: QuizHeaderProps) {
  const progress = stepCount > 0 ? Math.min(100, Math.max(0, (step / stepCount) * 100)) : 0;

  return (
    <header role="banner" className="fr-header tw:filter-none!">
      <div className="fr-container tw:hidden tw:lg:block">
        <div className="fr-header__body-row tw:items-start">
          <div className="fr-enlarge-link tw:hover:bg-raised-grey-hover tw:-my-4 tw:flex tw:items-center">
            <div className="fr-header__brand-top">
              <div className="fr-header__logo">
                <p className="fr-logo">
                  République
                  <br />
                  Française
                </p>
              </div>
            </div>
            <div className="tw:p-4 tw:text-title-grey">
              <Link to="/" title="Trouve ta mission">
                <p className="fr-header__service-title">Trouve ta mission</p>
              </Link>
              <p className="fr-header__service-tagline">Service public pour trouver une mission d'engagement</p>
            </div>
          </div>
          <Link to="/" title="Fermer" aria-label="Fermer" className="fr-icon-close-line tw:text-blue-france-sun! tw:ml-auto tw:p-2" />
        </div>
      </div>

      <div className="tw:relative tw:flex tw:lg:hidden tw:items-center tw:px-4 tw:h-14">
        <Link to="/" title="Retour à l'accueil" className="fr-icon-arrow-left-line fr-btn--icon-left tw:text-sm tw:text-blue-france-sun! tw:font-semi-bold!">
          Retour
        </Link>
        <p className="fr-h6 tw:absolute tw:left-1/2 tw:-translate-x-1/2 tw:mb-0">Trouve ta mission</p>
      </div>

      <div className="tw:h-2 tw:bg-beige-gris-galet">
        <div className="tw:h-full tw:bg-blue-france-sun tw:transition-[width] tw:duration-500 tw:ease-out" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
