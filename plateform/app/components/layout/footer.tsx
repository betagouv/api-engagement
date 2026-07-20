import { useLocation } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import { isGlobalFooterVisible } from "~/utils/layout";

// RGAA 9.2 : sur les résultats mobile, le footer est rendu dans le panneau dépliable, à
// l'intérieur du <main>. `landmark={false}` retire le role="contentinfo" explicite pour ne pas
// créer un landmark imbriqué (un <footer> descendant de <main> n'est pas un landmark en HTML).
export function FooterContent({ landmark = true }: { landmark?: boolean }) {
  return (
    <footer className="fr-footer" role={landmark ? "contentinfo" : undefined} id="footer" tabIndex={-1}>
      <div className="fr-container">
        <div className="fr-footer__body">
          <div className="fr-footer__brand fr-enlarge-link">
            <a href="/" title="Accueil — API Engagement">
              <p className="fr-logo">
                République
                <br />
                Française
              </p>
            </a>
          </div>
          <div className="fr-footer__content">
            <p className="fr-footer__content-desc">La plateforme vous accompagne dans votre recherche de missions et d'engagement.</p>
            <ul className="fr-footer__content-list">
              <li className="fr-footer__content-item">
                <a title="info.gouv.fr - nouvelle fenêtre" href="https://info.gouv.fr" target="_blank" rel="noopener external" className="fr-footer__content-link">
                  info.gouv.fr
                </a>
              </li>
              <li className="fr-footer__content-item">
                <a
                  title="service-public.gouv.fr - nouvelle fenêtre"
                  href="https://service-public.gouv.fr"
                  target="_blank"
                  rel="noopener external"
                  className="fr-footer__content-link"
                >
                  service-public.gouv.fr
                </a>
              </li>
              <li className="fr-footer__content-item">
                <a title="legifrance.gouv.fr - nouvelle fenêtre" href="https://legifrance.gouv.fr" target="_blank" rel="noopener external" className="fr-footer__content-link">
                  legifrance.gouv.fr
                </a>
              </li>
              <li className="fr-footer__content-item">
                <a title="data.gouv.fr - nouvelle fenêtre" href="https://data.gouv.fr" target="_blank" rel="noopener external" className="fr-footer__content-link">
                  data.gouv.fr
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="fr-footer__bottom">
          <ul className="fr-footer__bottom-list">
            <li className="fr-footer__bottom-item">
              <a className="fr-footer__bottom-link" href="/accessibilite">
                Accessibilité : totalement conforme
              </a>
            </li>
            <li className="fr-footer__bottom-item">
              <a className="fr-footer__bottom-link" href="/mentions-legales">
                Mentions légales
              </a>
            </li>
            <li className="fr-footer__bottom-item">
              <a className="fr-footer__bottom-link" href="/politique-de-confidentialite">
                Politique de confidentialité
              </a>
            </li>
            <li className="fr-footer__bottom-item">
              <a className="fr-footer__bottom-link" href="#">
                Statistiques
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isGlobalFooterVisible(location.pathname, isMobile)) {
    return null;
  }

  return <FooterContent />;
}
