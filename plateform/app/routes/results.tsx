import { Link } from "react-router";
import Label from "~/components/quiz/label";
import { useQuizStore } from "~/stores/quiz";
import { buildPayload } from "~/utils/quiz";

// Stub : les résultats réels arriveront dans une PR dédiée (payload /user-scoring + UI).
// Pour cette PR, on se contente d'afficher les réponses collectées pour valider le flow.
export default function ResultsPage() {
  const answers = useQuizStore((s) => s.answers);
  const geo = useQuizStore((s) => s.geo);

  return (
    <div>
      <Label>Quiz terminé</Label>
      <p className="fr-text--sm fr-mb-4w">Tes réponses ont été enregistrées. La page de résultats arrivera dans une prochaine itération.</p>

      <details className="fr-mb-4w">
        <summary>Voir le contenu du store (debug)</summary>
        <pre className="fr-mt-2w">{JSON.stringify(buildPayload(answers, geo), null, 2)}</pre>
      </details>

      <Link to="/quiz/age" className="fr-btn fr-btn--secondary">
        Recommencer le quiz
      </Link>
    </div>
  );
}
