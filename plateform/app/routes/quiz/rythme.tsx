import { useState } from "react";
import { useOutletContext } from "react-router";
import CheckboxGroupRich from "~/components/quiz/checkbox-group-rich";
import NextButton from "~/components/quiz/next-button";
import { getStepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "rythme";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["rythme.ponctuelle_journee"],
  OPTIONS["rythme.quelques_heures_semaine"],
  OPTIONS["rythme.plusieurs_jours_semaine"],
  OPTIONS["rythme.quelques_jours_annee"],
  OPTIONS["rythme.temps_plein_plusieurs_mois"],
  OPTIONS["rythme.je_ne_sais_pas"],
];

const STEP = getStepDef(STEP_ID);

export default function RythmeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "rythme", option_ids: value });
  };

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    saveScoring();
    goNext();
  };

  return (
    <>
      <CheckboxGroupRich title={STEP.title} subtitle={STEP.subtitle} onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} required />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
