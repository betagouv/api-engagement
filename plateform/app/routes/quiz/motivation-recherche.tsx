import { useState } from "react";
import { useOutletContext } from "react-router";
import CheckboxGroupRich from "~/components/quiz/checkbox-group-rich";
import NextButton from "~/components/quiz/next-button";
import { getStepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "motivation_recherche";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["motivation_recherche.premiere_experience"],
  OPTIONS["motivation_recherche.decouverte_metier"],
  OPTIONS["motivation_recherche.agir_pour_une_cause"],
  OPTIONS["motivation_recherche.securite_pays"],
  OPTIONS["motivation_recherche.remote"],
  OPTIONS["motivation_recherche.rencontres"],
  OPTIONS["motivation_recherche.indemnisation"],
  OPTIONS["motivation_recherche.horaires_flexibles"],
  OPTIONS["motivation_recherche.autre"],
];

const STEP = getStepDef(STEP_ID);

export default function MotivationsStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "motivation_recherche", option_ids: value });
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
      <NextButton onClick={handleNext} />
    </>
  );
}
