import { Link, useLocation, useMatches } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";

export default function Header() {
  const matches = useMatches();
  const location = useLocation();
  const isMobile = useIsMobile();
  const activeMatch = [...matches].reverse().find((m) => m.loaderData != null);
  const routeData = activeMatch?.loaderData as { header?: string; backHref?: string | null } | undefined;

  if (routeData?.header === "hidden") {
    return null;
  }

  const isHome = location.pathname === "/";
  const backHref = routeData?.backHref;

  // Rendu conditionnel plutôt que masquage CSS : une seule version du header dans le DOM,
  // pour ne pas dupliquer les liens « Accueil — Trouve ta mission ».
  if (isMobile) {
    return (
      <header role="banner" className="fr-header">
        {isHome || backHref === null ? (
          <div className="relative flex items-center px-4 py-2">
            <p className="fr-logo fr-logo--sm mb-0">
              République
              <br />
              Française
            </p>
            <Link to="/" title="Accueil — Trouve ta mission" className="fr-text--md fr-text--bold absolute left-1/2 -translate-x-1/2">
              <p className="fr-header__service-title">Trouve ta mission</p>
            </Link>
          </div>
        ) : (
          <div className="relative flex h-14 items-center px-4">
            <Link to={backHref ?? "/"} aria-label="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-semi-bold!">
              Retour
            </Link>
            <Link to="/" title="Accueil — Trouve ta mission" className="fr-text--md fr-text--bold absolute left-1/2 -translate-x-1/2">
              <p className="fr-header__service-title">Trouve ta mission</p>
            </Link>
          </div>
        )}
      </header>
    );
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
                <Link to="/" title="Accueil — Trouve ta mission">
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
