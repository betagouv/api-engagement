import { Link, useLocation } from "react-router";

export default function Header() {
  const location = useLocation();
  const isQuiz = location.pathname.startsWith("/quiz");

  if (isQuiz) {
    return null;
  }

  return (
    <header role="banner" className="fr-header">
      <div className="fr-header__body">
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
    </header>
  );
}
