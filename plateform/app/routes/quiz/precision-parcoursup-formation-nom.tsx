import { useEffect, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import { getStepDef } from "~/config/quiz-flow";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_parcoursup_formation_nom";

const STEP = getStepDef(STEP_ID);

// Step custom : capture libre du nom de formation (texte brut).
// Pas de taxonomyKey — la valeur est transmise telle quelle au backend pour mapping ultérieur
// (ex: V1, matching avec une base de formations).
export default function PrecisionParcoursupFormationNomStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const stored = answers[STEP_ID];
    if (stored?.type === "text") setValue(stored.value);
  }, [answers]);

  const valid = value.trim().length > 0;

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid) {
      setError("Indique le nom d'une formation pour continuer");
      return;
    }
    setAnswer(STEP_ID, { type: "text", value: value.trim() });
    saveScoring();
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label subtitle={STEP.subtitle} htmlFor="formation-input" error={error} required>
        {STEP.title}
      </Label>

      <div className={`fr-input-group max-w-md! ${error ? "fr-input-group--error" : ""}`}>
        {/* eslint-disable jsx-a11y/no-autofocus -- Cette étape place volontairement le focus sur son unique champ de saisie. */}
        <input
          id="formation-input"
          className={`fr-input ${error ? "fr-input--error" : ""}`}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "formation-input-messages" : undefined}
          autoFocus
        />
        {/* eslint-enable jsx-a11y/no-autofocus */}
        {error && (
          <div className="fr-messages-group" id="formation-input-messages" aria-live="polite">
            <p className="fr-message fr-message--error">{error}</p>
          </div>
        )}
      </div>

      <NextButton type="submit" />
    </form>
  );
}
