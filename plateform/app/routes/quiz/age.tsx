import { useEffect, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Title from "~/components/quiz/title";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const MIN_AGE = 16;
const MAX_AGE = 99;

const STEP_ID = "age";
// Step custom : stocke une valeur numérique brute (pas de taxonomyKey).
// Utilisée uniquement dans les conditions des steps suivants (ex: handicap).
export default function AgeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (answers[STEP_ID]?.type === "numeric") setValue(String(answers[STEP_ID].value));
  }, [answers[STEP_ID]]);

  const numeric = Number(value);
  const valid = value !== "" && Number.isFinite(numeric) && numeric >= MIN_AGE && numeric <= MAX_AGE;

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid) return;
    setAnswer(STEP_ID, { type: "numeric", value: numeric });
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-10">
      <Title subtitle="Certaines missions dépendent de l'âge.">Quel âge as-tu ?</Title>

      <input
        id="age-input"
        className="fr-input tw:max-w-80!"
        type="number"
        inputMode="numeric"
        min={MIN_AGE}
        max={MAX_AGE}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />

      <button type="submit" className="fr-btn fr-btn--lg" disabled={!valid}>
        Continuer
      </button>
    </form>
  );
}
