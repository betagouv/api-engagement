import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "handicap";

const STEP_OPTIONS = [OPTIONS["handicap.oui"], OPTIONS["handicap.non"], OPTIONS["handicap.ne_se_prononce_pas"]];

export default function HandicapStep() {
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
      <Label subtitle="Certaines missions sont accessibles jusqu’à 30 ans pour les personnes en situation de handicap.">Es-tu en situation de handicap reconnue ?</Label>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} error={error} />
      <NextButton onClick={handleNext} />
    </>
  );
}
