import { Link } from "react-router";
import type { Route } from "./+types/plan-du-site";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Plan du site — Trouve ta mission" }];
}

export default function PlanDuSite() {
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container max-w-3xl py-8 md:py-16">
        <h1>Plan du site</h1>
        <ul>
          <li className="py-1">
            <Link className="fr-link" to="/">
              Accueil
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/quiz">
              Faire le quiz
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/missions">
              Toutes les missions
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/plan-du-site">
              Plan du site
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/accessibilite">
              Accessibilité
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/mentions-legales">
              Mentions légales
            </Link>
          </li>
          <li className="py-1">
            <Link className="fr-link" to="/politique-de-confidentialite">
              Politique de confidentialité
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
