export function meta() {
  return [{ name: "robots", content: "noindex, nofollow" }];
}

// Pas de loader serveur → clientLoader seul = rendu client uniquement
// Le serveur renvoie HydrateFallback, le client prend le relais après hydratation
export async function clientLoader() {}

export default function QuizPage() {
  return (
    <main className="fr-container fr-py-6w">
      <h1>Quiz Engagement</h1>
    </main>
  );
}
