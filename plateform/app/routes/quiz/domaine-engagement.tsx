import { useState } from "react";
import { useOutletContext } from "react-router";
import CheckboxGroupRich from "~/components/quiz/checkbox-group-rich";
import NextButton from "~/components/quiz/next-button";
import { getStepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "domaine_engagement";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["domaine_engagement.sante_bien_etre"],
  OPTIONS["domaine_engagement.sport"],
  OPTIONS["domaine_engagement.solidarite_inclusion"],
  OPTIONS["domaine_engagement.environnement_animaux"],
  OPTIONS["domaine_engagement.art_culture"],
  OPTIONS["domaine_engagement.securite_secours"],
  OPTIONS["domaine_engagement.citoyennete"],
  OPTIONS["domaine_engagement.numerique"],
  OPTIONS["domaine_engagement.education"],
];

const STEP = getStepDef(STEP_ID);

export default function DomainesStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "domaine_engagement", option_ids: value });
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
