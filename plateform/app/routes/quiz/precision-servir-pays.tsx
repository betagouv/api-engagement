import { useOutletContext } from "react-router";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
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
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string[]) => {
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  return (
    <>
      <Title>Quel type d'engagement pourrait t'intéresser le plus ?</Title>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
