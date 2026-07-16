import { useLocation } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import { isFooterVisible } from "~/utils/layout";

// Liens d'évitement DSFR (RGAA 12.7). Doit rester le premier élément focusable du <body>.
// Pas de lien « Menu » : le site n'a pas de menu de navigation à cibler.
// Le lien « Pied de page » n'est rendu que si le footer est présent sur la route courante
// (masqué sur le quiz et sur /results en mobile), pour ne pas annoncer une cible inexistante.
export default function SkipLinks() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const footerVisible = isFooterVisible(location.pathname, isMobile);

  return (
    <div className="fr-skiplinks">
      <nav className="fr-container" role="navigation" aria-label="Accès rapide">
        <ul className="fr-skiplinks__list">
          <li>
            <a className="fr-link" href="#contenu">
              Contenu
            </a>
          </li>
          {footerVisible && (
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
