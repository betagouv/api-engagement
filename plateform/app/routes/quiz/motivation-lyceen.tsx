import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "motivation_lyceen";

const STEP_OPTIONS = [
  OPTIONS["motivation.me_sentir_utile"],
  OPTIONS["motivation.booster_parcoursup"],
  OPTIONS["motivation.tester_orientation"],
  OPTIONS["motivation.servir_le_pays"],
  OPTIONS["motivation.ne_sais_pas"],
];

export default function MotivationLyceenStep() {
  const { setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleChange = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <Title>Qu'est-ce qui te motive le plus ?</Title>
      <SingleSelect onChange={handleChange} options={STEP_OPTIONS} />
      <div className="fr-mt-4w tw:flex tw:flex-col tw:sm:flex-row tw:gap-4 tw:items-center">
        <button type="button" className="fr-btn tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goNext}>
          Continuer
        </button>
        <button type="button" className="fr-btn fr-btn--secondary tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goBack}>
          Retour
        </button>
      </div>
    </>
  );
}
