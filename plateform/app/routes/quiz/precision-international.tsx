import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import NextButton from "~/components/quiz/next-button";
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
      <Label>Dans quelle région du monde souhaiterais-tu partir ?</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
