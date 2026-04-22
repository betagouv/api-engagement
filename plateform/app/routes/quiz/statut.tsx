import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";

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
  const goNext = useOutletContext<() => void>();
  const [options, setOptions] = useState<StepOption[]>([]);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel est ton statut ?</h1>
      <SingleSelect onChange={handleSelect} options={options} />
    </>
  );
}
