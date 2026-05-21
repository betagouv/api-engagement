import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import CheckboxGroupRich from "~/components/quiz/checkbox-group-rich";
import NextButton from "~/components/quiz/next-button";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "duree";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["type_mission.ponctuelle"],
  OPTIONS["type_mission.temps_plein"],
  OPTIONS["type_mission.reguliere"],
  { ...OPTIONS["type_mission.je_ne_sais_pas"], hiddenIf: numericRange("age", 16, 25) },
];

export default function DureeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "type_mission", option_ids: value });
  };

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <CheckboxGroupRich
        title="Combien de temps aimerais-tu consacrer à ta mission ?"
        subtitle="Choisis ce qui te correspond le mieux."
        onChange={handleSelect}
        options={options}
        selected={selected}
        error={error}
      />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
