import { Link, useLocation, useMatches } from "react-router";

import TtmLogoSvg from "~/assets/svg/ttm-logo.svg";

export const SERVICE_TITLE = "TrouveTaMission.gouv.fr";
export const SERVICE_TAGLINE = "Tout l’engagement public à portée de clic";

export default function Header() {
  const matches = useMatches();
  const location = useLocation();
  const activeMatch = [...matches].reverse().find((m) => m.loaderData != null);
  const routeData = activeMatch?.loaderData as { header?: string; backHref?: string | null } | undefined;

  if (routeData?.header === "hidden") {
    return null;
  }

  const isHome = location.pathname === "/";
  const backHref = routeData?.backHref;
  const showBackLink = !isHome && backHref !== null;

  // Retour SIG : bloc marque + nom du service en toutes lettres sur toutes les pages, en mobile comme en desktop.
  // Le DSFR passe le nom du service sous le bloc marque en mobile ; le lien « Retour » occupe la zone
  // fonctionnelle à droite du bloc marque, en mobile uniquement (en desktop, les pages ont leur propre lien retour).
  return (
    <header role="banner" className="fr-header">
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
                {showBackLink && (
                  <Link
                    to={backHref ?? "/"}
                    className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left mr-2 ml-auto self-start mt-2 lg:hidden!"
                  >
                    Retour
                  </Link>
                )}
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
