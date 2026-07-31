import { useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroupRich from "~/components/quiz/radio-group-rich";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "equipe";

const STEP_OPTIONS: StepOption[] = [OPTIONS["equipe.autonomie"], OPTIONS["equipe.petit_groupe"], OPTIONS["equipe.grand_collectif"], OPTIONS["equipe.peu_importe"]];

const DEFAULT_TITLE = "Dans quel type d’équipe te sentirais-tu le plus à l’aise ?";

export default function EquipeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "equipe", option_ids: [value] });
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
      <RadioGroupRich title={DEFAULT_TITLE} onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} required />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
