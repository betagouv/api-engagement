import { useEffect, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label subtitle="Certaines missions dépendent de l'âge." htmlFor="age-input">
        Quel âge as-tu ?
      </Label>

      <select id="age-input" className="fr-select max-w-80!" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Sélectionnez votre âge</option>
        {Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => (
          <option key={i} value={i + MIN_AGE}>
            {i + MIN_AGE}
          </option>
        ))}
      </select>
      <NextButton onClick={goNext} type="submit" disabled={!valid} />
    </form>
  );
}
