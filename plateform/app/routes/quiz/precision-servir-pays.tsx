import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import NextButton from "~/components/quiz/next-button";
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
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <Label>Quel type d'engagement pourrait t'intéresser le plus ?</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
