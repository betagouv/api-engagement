import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router";
import Title from "~/components/quiz/title";
import type { QuizOutletContext } from "./_layout";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_parcoursup_formation_nom";

// Step custom : capture libre du nom de formation (texte brut).
// Pas de taxonomyKey — la valeur est transmise telle quelle au backend pour mapping ultérieur
// (ex: V1, matching avec une base de formations).
export default function PrecisionParcoursupFormationNomStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const stored = answers[STEP_ID];
    if (stored?.type === "text") setValue(stored.value);
  }, [answers]);

  const valid = value.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setAnswer(STEP_ID, { type: "text", value: value.trim() });
    goNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Title>Quelle formation as-tu en tête ?</Title>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="formation-input">
          Nom de la formation
        </label>
        <input id="formation-input" className="fr-input" type="text" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </div>

      <div className="fr-mt-2w">
        <button type="button" className="fr-btn fr-btn--secondary fr-mr-2w" onClick={goBack}>
          Retour
        </button>
        <button type="submit" className="fr-btn" disabled={!valid}>
          Continuer
        </button>
      </div>
    </form>
  );
}
