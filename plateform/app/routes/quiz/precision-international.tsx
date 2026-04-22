import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_international";

// Régions du monde. Condition de visibilité dans QUIZ_FLOW : masqué si `duree = ponctuelle`.
const STEP_OPTIONS = [
  OPTIONS["international.europe"],
  OPTIONS["international.afrique"],
  OPTIONS["international.amerique"],
  OPTIONS["international.asie"],
  OPTIONS["international.ne_sais_pas"],
];

export default function PrecisionInternationalStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quelle région du monde souhaiterais-tu partir ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
