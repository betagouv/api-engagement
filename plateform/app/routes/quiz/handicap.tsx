import { useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroup from "~/components/quiz/radio-group";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "handicap";

const STEP_OPTIONS = [OPTIONS["handicap.oui"], OPTIONS["handicap.non"], OPTIONS["handicap.ne_se_prononce_pas"]];

export default function HandicapStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  const handleSelect = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "handicap", option_ids: [value] });
    const existing = answers["tranche_age"];
    if (existing?.type === "params") {
      setAnswer("tranche_age", { ...existing, params: { ...existing.params, handicap: value === "oui" } });
    }
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <RadioGroup
        title="Es-tu en situation de handicap reconnue ?"
        subtitle="Certaines missions sont accessibles jusqu’à 30 ans pour les personnes en situation de handicap."
        onChange={handleSelect}
        options={STEP_OPTIONS}
        error={error}
        selected={selected}
      />
      <NextButton onClick={handleNext} />
    </>
  );
}
