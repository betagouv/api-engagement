import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import SingleSelectIcon from "~/components/quiz/single-select-icon";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "statut";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["statut.lyceen"],
  OPTIONS["statut.etudiant"],
  OPTIONS["statut.demandeur_emploi"],
  OPTIONS["statut.actif"],
  { ...OPTIONS["statut.retraite"], hiddenIf: numericRange("age", 16, 25) },
  OPTIONS["statut.autre"],
];

export default function StatutStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

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
      <Label subtitle="Ça nous aide à te proposer des missions adaptées à ton quotidien.">Que fais-tu en ce moment ?</Label>
      <SingleSelectIcon onChange={handleSelect} options={options} error={error} />
      <NextButton onClick={handleNext} />
    </>
  );
}
