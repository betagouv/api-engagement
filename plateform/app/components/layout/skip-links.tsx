import { useLocation } from "react-router";
import { hasFooterTarget } from "~/utils/layout";

// Liens d'évitement DSFR (RGAA 12.7). Doit rester le premier élément focusable du <body>.
// Pas de lien « Menu » : le site n'a pas de menu de navigation à cibler.
// Le lien « Pied de page » n'est rendu que si la route comporte une cible #footer
// (cf. hasFooterTarget), pour ne pas annoncer une cible inexistante (masquée sur le quiz).
export default function SkipLinks() {
  const location = useLocation();
  const footerTarget = hasFooterTarget(location.pathname);

  return (
    <div className="fr-skiplinks">
      <nav className="fr-container" role="navigation" aria-label="Accès rapide">
        <ul className="fr-skiplinks__list">
          <li>
            <a className="fr-link" href="#contenu">
              Contenu
            </a>
          </li>
          {footerTarget && (
            <li>
              <a className="fr-link" href="#footer">
                Pied de page
              </a>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
