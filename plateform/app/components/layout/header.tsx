import { Link, useMatches } from "react-router";

export default function Header() {
  const matches = useMatches();
  const activeMatch = [...matches].reverse().find((m) => m.data != null);
  const routeData = activeMatch?.data as { header?: string; backHref?: string | null } | undefined;

  if (routeData?.header === "hidden") {
    return null;
  }

  const backHref = routeData?.backHref;

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

      {backHref === null ? (
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
          <Link to={backHref ?? "/"} aria-label="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-semi-bold!">
            Retour
          </Link>
          <Link to="/" title="Trouve ta mission" className="fr-text--md fr-text--bold absolute left-1/2 -translate-x-1/2">
            <p className="fr-header__service-title">Trouve ta mission</p>
          </Link>
        </div>
      )}
    </header>
  );
}
