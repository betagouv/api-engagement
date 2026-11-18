import { Link, useLocation } from "react-router";

import TtmLogoSvg from "~/assets/svg/ttm-logo.svg";

export const SERVICE_TITLE = "TrouveTaMission.gouv.fr";
export const SERVICE_TAGLINE = "Tout l’engagement public à portée de clic";

export default function Header() {
  // « Espace Accompagnateurs » : uniquement sur la homepage et sa propre landing (ni quiz ni landings à destination des jeunes), desktop uniquement.
  const { pathname } = useLocation();
  const showAccompagnateurs = pathname === "/" || pathname === "/accompagnateurs";
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
                  <img src={TtmLogoSvg} alt="TrouveTaMission.gouv.fr" className="w-24 lg:w-38" />
                </div>
              </div>
              <div className="fr-header__service">
                <Link to="/" title={`Accueil — ${SERVICE_TITLE}`}>
                  {/* Badge bêta prévu par le DSFR à côté du nom du service : signale la bêta sur toutes les pages.
                      Écrit « Bêta » : le DSFR l'affiche en majuscules (« BÊTA ») et les lecteurs d'écran lisent le mot. */}
                  <p className="fr-header__service-title">
                    {SERVICE_TITLE} <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">Bêta</span>
                  </p>
                </Link>
                <p className="fr-header__service-tagline">{SERVICE_TAGLINE}</p>
              </div>
            </div>
            {showAccompagnateurs && (
              <div className="fr-header__tools">
                {/* Masqué sous `lg` par le DSFR (il l'attend dupliqué dans un menu burger, absent ici) : visible en desktop uniquement en attendant une vraie navigation. */}
                <div className="fr-header__tools-links">
                  <ul className="fr-btns-group">
                    <li>
                      <Link to="/accompagnateurs" className="fr-btn fr-icon-team-line" aria-current={pathname === "/accompagnateurs" ? "page" : undefined}>
                        Espace Accompagnateurs
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
