import { Link } from "react-router";

import TtmLogoSvg from "~/assets/svg/ttm-logo.svg";

export const SERVICE_TITLE = "TrouveTaMission.gouv.fr";
export const SERVICE_TAGLINE = "Tout l’engagement public à portée de clic";

export default function Header() {
  // Retour SIG : même header sur toutes les pages, quiz compris, en mobile comme en desktop.
  // Le DSFR passe le nom du service sous le bloc marque en mobile. Les liens « Retour » vivent dans les pages.
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
                <div className="fr-header__operator">
                  <img src={TtmLogoSvg} alt="Trouve ta mission" className="w-24 lg:w-38" />
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
    </header>
  );
}
