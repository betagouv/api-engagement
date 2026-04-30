import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "handicap";

const STEP_OPTIONS = [OPTIONS["handicap.oui"], OPTIONS["handicap.non"], OPTIONS["handicap.ne_se_prononce_pas"]];

export default function HandicapStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title subtitle="Certaines missions sont accessibles jusqu’à 30 ans pour les personnes en situation de handicap.">Es-tu reconnu en situation de handicap ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
