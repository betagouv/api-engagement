import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_parcoursup_formation";

const STEP_OPTIONS = [OPTIONS["parcoursup_formation.oui"], OPTIONS["parcoursup_formation.non"]];

export default function PrecisionParcoursupFormationStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>As-tu déjà une formation précise en tête ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
