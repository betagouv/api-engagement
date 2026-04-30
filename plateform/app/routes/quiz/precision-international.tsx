import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_international";

// Régions du monde. Condition de visibilité dans QUIZ_FLOW : masqué si `type_mission = ponctuelle`.
const STEP_OPTIONS = [
  OPTIONS["region_internationale.europe"],
  OPTIONS["region_internationale.afrique"],
  OPTIONS["region_internationale.amerique"],
  OPTIONS["region_internationale.asie"],
  OPTIONS["region_internationale.je_ne_sais_pas"],
];

export default function PrecisionInternationalStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>Dans quelle région du monde souhaiterais-tu partir ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
