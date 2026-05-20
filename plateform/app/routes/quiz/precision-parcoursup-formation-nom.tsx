import { useEffect, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_parcoursup_formation_nom";

// Step custom : capture libre du nom de formation (texte brut).
// Pas de taxonomyKey — la valeur est transmise telle quelle au backend pour mapping ultérieur
// (ex: V1, matching avec une base de formations).
export default function PrecisionParcoursupFormationNomStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const stored = answers[STEP_ID];
    if (stored?.type === "text") setValue(stored.value);
  }, [answers]);

  const valid = value.trim().length > 0;

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid) return;
    setAnswer(STEP_ID, { type: "text", value: value.trim() });
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label>Dans quel domaine aimerais-tu avoir une expérience ?</Label>

      <div className="fr-input-group max-w-md!">
        <label className="fr-label" htmlFor="formation-input">
          Nom de la formation
        </label>
        <input id="formation-input" className="fr-input" type="text" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </div>

      <NextButton onClick={goNext} type="submit" disabled={!valid} />
    </form>
  );
}
