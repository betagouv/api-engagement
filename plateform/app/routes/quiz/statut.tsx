import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
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

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Label subtitle="Ça nous aide à te proposer des missions adaptées à ton quotidien.">Que fais-tu en ce moment ?</Label>
      <SingleSelectIcon onChange={handleSelect} options={options} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
