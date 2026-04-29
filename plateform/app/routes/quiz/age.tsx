import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router";
import Title from "~/components/quiz/title";
import type { QuizOutletContext } from "./_layout";
import { useQuizStore } from "~/stores/quiz";

const MIN_AGE = 16;
const MAX_AGE = 99;

const STEP_ID = "age";
// Step custom : stocke une valeur numérique brute (pas de taxonomyKey).
// Utilisée uniquement dans les conditions des steps suivants (ex: handicap).
export default function AgeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (answers[STEP_ID]?.type === "numeric") setValue(String(answers[STEP_ID].value));
  }, [answers[STEP_ID]]);

  const numeric = Number(value);
  const valid = value !== "" && Number.isFinite(numeric) && numeric >= MIN_AGE && numeric <= MAX_AGE;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setAnswer(STEP_ID, { type: "numeric", value: numeric });
    goNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="fr-h3">Quel âge as-tu ?</h1>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="age-input">
          Âge
          <span className="fr-hint-text">
            Entre {MIN_AGE} et {MAX_AGE} ans
          </span>
        </label>
        <input
          id="age-input"
          className="fr-input"
          type="number"
          inputMode="numeric"
          min={MIN_AGE}
          max={MAX_AGE}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
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
