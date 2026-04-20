import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const OPTIONS: StepOption[] = [
  { id: "oui", label: "Oui", taxonomyKey: "handicap.oui" },
  { id: "non", label: "Non", taxonomyKey: "handicap.non" },
  { id: "ne_se_prononce_pas", label: "Je préfère ne pas répondre", taxonomyKey: "handicap.ne_se_prononce_pas" },
];

const STEP_ID = "handicap";

export default function HandicapStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Es-tu reconnu en situation de handicap ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
