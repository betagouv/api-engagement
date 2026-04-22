import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_parcoursup_formation";

const STEP_OPTIONS = [OPTIONS["parcoursup_formation.oui"], OPTIONS["parcoursup_formation.non"]];

export default function PrecisionParcoursupFormationStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">As-tu déjà une formation précise en tête ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
