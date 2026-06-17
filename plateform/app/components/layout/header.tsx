import { Link, useLocation, useNavigate } from "react-router";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isQuiz = location.pathname.startsWith("/quiz");
  const isLanding = location.pathname === "/";
  const isResults = /^\/results\/[^/]+$/.test(location.pathname);

  if (isQuiz) {
    return null;
  }

  return (
    <header role="banner" className="fr-header">
      <div className="fr-header__body hidden lg:block">
        <div className="fr-container">
          <div className="fr-header__body-row">
            <div className="fr-header__brand fr-enlarge-link">
              <div className="fr-header__brand-top">
                <div className="fr-header__logo">
                  <p className="fr-logo">
                    République
                    <br />
                    Française
                  </p>
                </div>
              </div>
              <div className="fr-header__service">
                <Link to="/" title="Trouve ta mission">
                  <p className="fr-header__service-title">Trouve ta mission</p>
                </Link>
                <p className="fr-header__service-tagline">Service public pour trouver une mission d'engagement</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLanding || isResults ? (
        <div className="relative flex items-center px-4 py-2 lg:hidden">
          <p className="fr-logo fr-logo--sm mb-0">
            République
            <br />
            Française
          </p>
          <Link to="/" title="Trouve ta mission" className="fr-text--md fr-text--bold absolute left-1/2 -translate-x-1/2">
            <p className="fr-header__service-title">Trouve ta mission</p>
          </Link>
        </div>
      ) : (
        <div className="relative flex h-14 items-center px-4 lg:hidden">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            title="Retour"
            className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-semi-bold!"
          >
            Retour
          </button>
          <Link to="/" title="Trouve ta mission" className="fr-text--md fr-text--bold absolute left-1/2 -translate-x-1/2">
            <p className="fr-header__service-title">Trouve ta mission</p>
          </Link>
        </div>
      )}
    </header>
  );
}
