import { Link } from "react-router";
import type { Route } from "./+types/_index";
// Balises <head> générées côté serveur → OG tags visibles par les crawlers sociaux
export function meta(): Route.MetaDescriptors {
  return [
    { title: "Quiz Engagement — Trouvez votre mission de bénévolat" },
    { name: "description", content: "Répondez à quelques questions et découvrez les missions de bénévolat faites pour vous." },
    { property: "og:title", content: "Quiz Engagement" },
    { property: "og:description", content: "Trouvez votre mission de bénévolat en quelques clics." },
    { property: "og:type", content: "website" },
  ];
}

export default function Landing() {
  return (
    <main className="fr-container fr-py-6w">
      <h1>Trouvez votre mission de bénévolat</h1>
      <p className="fr-text--lead">Répondez à quelques questions et découvrez les missions faites pour vous.</p>

      <Link to="/quiz/age" className="fr-btn fr-btn--lg fr-mb-6w">
        Commencer le quiz
      </Link>
    </main>
  );
}
