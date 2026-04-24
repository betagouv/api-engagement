export default function Header() {
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
                <a href="/" title="Accueil — API Engagement">
                  <p className="fr-header__service-title">API Engagement</p>
                </a>
                <p className="fr-header__service-tagline">Trouvez votre mission de bénévolat</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
