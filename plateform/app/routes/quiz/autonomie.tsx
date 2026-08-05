import { useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroupRich from "~/components/quiz/radio-group-rich";
import { getStepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "autonomie";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["autonomie.organisation_libre"],
  OPTIONS["autonomie.accompagnement_initial"],
  OPTIONS["autonomie.cadre_suivi_regulier"],
  OPTIONS["autonomie.je_ne_sais_pas"],
];

const STEP = getStepDef(STEP_ID);

export default function AutonomieStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "autonomie", option_ids: [value] });
  };

  const handleNext = () => {
    if (!selected) {
      setError("Sélectionne une réponse");
      return;
    }
    saveScoring();
    goNext();
  };

  return (
    <>
      <RadioGroupRich title={STEP.title} subtitle={STEP.subtitle} onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} required />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
