import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_parcoursup_formation";

const OPTIONS: StepOption[] = [
  { id: "oui", label: "Oui", taxonomyKey: "parcoursup_formation.oui" },
  { id: "non", label: "Non", taxonomyKey: "parcoursup_formation.non" },
];

export default function PrecisionParcoursupFormationStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">As-tu déjà une formation précise en tête ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
