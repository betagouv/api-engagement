import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "motivation_autres";

const STEP_OPTIONS = [
  OPTIONS["motivation.me_sentir_utile"],
  OPTIONS["motivation.decouvrir_domaine"],
  OPTIONS["motivation.servir_le_pays"],
  OPTIONS["motivation.ne_sais_pas"],
];

export default function MotivationAutresStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleChange = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Qu'est-ce qui te motive le plus ?</h1>
      <SingleSelect onChange={handleChange} options={STEP_OPTIONS} />
    </>
  );
}
