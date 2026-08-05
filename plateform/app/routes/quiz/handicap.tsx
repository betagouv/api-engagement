import { useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroup from "~/components/quiz/radio-group";
import { getStepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "handicap";

const STEP_OPTIONS = [OPTIONS["handicap.oui"], OPTIONS["handicap.non"], OPTIONS["handicap.ne_se_prononce_pas"]];

const STEP = getStepDef(STEP_ID);

export default function HandicapStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "handicap", option_ids: [value] });
    const existing = answers["tranche_age"];
    if (existing?.type === "params") {
      setAnswer("tranche_age", { ...existing, params: { ...existing.params, handicap: value === "oui" } });
    }
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    saveScoring();
    goNext();
  };

  return (
    <>
      <RadioGroup title={STEP.title} subtitle={STEP.subtitle} onChange={handleSelect} options={STEP_OPTIONS} error={error} selected={selected} required />
      <NextButton onClick={handleNext} />
    </>
  );
}
