import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroupRich from "~/components/quiz/radio-group-rich";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "statut";

const STEP_OPTIONS: StepOption[] = [OPTIONS["statut.lyceen"], OPTIONS["statut.etudiant"], OPTIONS["statut.demandeur_emploi"], OPTIONS["statut.actif"], OPTIONS["statut.autre"]];

export default function StatutStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "statut", option_ids: [value] });
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
      <RadioGroupRich
        title="Que fais-tu en ce moment ?"
        subtitle="Ça nous aide à te proposer des missions adaptées à ton quotidien."
        onChange={handleSelect}
        options={options}
        selected={selected}
        error={error}
      />
      <NextButton onClick={handleNext} />
    </>
  );
}
