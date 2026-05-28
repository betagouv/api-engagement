import { useLocation } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";

export function FooterContent() {
  return (
    <footer className="fr-footer" role="contentinfo" id="footer">
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
        </div>
        <div className="fr-footer__bottom">
          <ul className="fr-footer__bottom-list">
            <li className="fr-footer__bottom-item">
              <a className="fr-footer__bottom-link" href="/accessibilite">
                Accessibilité : totalement conforme
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
  const isQuiz = location.pathname.startsWith("/quiz");
  const isMobileResults = isMobile && location.pathname.startsWith("/results");

  if (isQuiz || isMobileResults) {
    return null;
  }

  return <FooterContent />;
}
