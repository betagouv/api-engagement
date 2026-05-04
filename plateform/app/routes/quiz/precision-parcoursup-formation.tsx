import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_parcoursup_formation";

const STEP_OPTIONS = [OPTIONS["parcoursup_formation.oui"], OPTIONS["parcoursup_formation.non"]];

export default function PrecisionParcoursupFormationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <Label>As-tu déjà une formation précise en tête ?</Label>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
