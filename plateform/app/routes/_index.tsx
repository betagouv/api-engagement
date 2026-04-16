import { Link } from "react-router";
import { API_URL } from "~/services/config";
import type { Mission } from "~/types/quiz";
import type { Route } from "./+types/_index";

// Exécuté côté serveur → missions dans le HTML initial → indexé par Google
export async function loader(): Promise<{ missions: Mission[] }> {
  const response = await fetch(`${API_URL}/v0/mission?limit=6&publishers=true`);

  if (!response.ok) {
    return { missions: [] };
  }

  const data = await response.json();
  return { missions: data.hits ?? [] };
}

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

export default function Landing({ loaderData }: Route.ComponentProps) {
  const { missions } = loaderData;

  return (
    <main className="fr-container fr-py-6w">
      <h1>Trouvez votre mission de bénévolat</h1>
      <p className="fr-text--lead">Répondez à quelques questions et découvrez les missions faites pour vous.</p>

      <Link to="/quiz/question-1" className="fr-btn fr-btn--lg fr-mb-6w">
        Commencer le quiz
      </Link>
    </main>
  );
}
