import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_servir_pays";

// Spec partielle côté produit — options dérivées au mieux de la note Notion.
// TODO : clarifier "Armée" (branches Marine / Air / Santé — sous-options ou libellés séparés ?).
const STEP_OPTIONS = [
  OPTIONS["servir_pays.armee"],
  OPTIONS["servir_pays.pompiers"],
  OPTIONS["servir_pays.gendarmerie"],
  OPTIONS["servir_pays.police"],
  OPTIONS["servir_pays.ne_sais_pas"],
  OPTIONS["servir_pays.aucun"],
];

export default function PrecisionServirPaysStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>Quel type d'engagement te parle le plus ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
