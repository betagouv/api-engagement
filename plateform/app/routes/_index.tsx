import { Link } from "react-router";
import api from "~/services/api";
import type { Mission } from "~/types/quiz";
import type { Route } from "./+types/_index";

// Exécuté côté serveur → missions dans le HTML initial → indexé par Google
export async function loader(): Promise<{ missions: Mission[] }> {
  try {
    const missions = await api.get<Mission[]>("/v0/mission?limit=6");
    return { missions };
  } catch {
    return { missions: [] };
  }
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

export default function Landing(_: Route.ComponentProps) {
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
