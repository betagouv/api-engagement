import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import NextButton from "~/components/quiz/next-button";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_thematique";

// Mapping référentiel `engagement_intent` (voir Notion — Étape 7 lycéen / me_sentir_utile).
const STEP_OPTIONS = [
  OPTIONS["engagement_intent.aide_directe"],
  OPTIONS["engagement_intent.transmission"],
  OPTIONS["engagement_intent.animation"],
  OPTIONS["engagement_intent.action_terrain"],
  OPTIONS["engagement_intent.secours"],
  OPTIONS["engagement_intent.cadre_engage"],
  OPTIONS["engagement_intent.support_organisation"],
  OPTIONS["engagement_intent.exploration"],
];

export default function PrecisionThematiqueStep() {
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
      <Label>Parmi ces choix, quelle thématique te parle le plus ?</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
