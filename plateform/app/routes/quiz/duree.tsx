import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelectIcon from "~/components/quiz/single-select-icon";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "duree";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["type_mission.ponctuelle"],
  OPTIONS["type_mission.reguliere"],
  OPTIONS["type_mission.temps_plein"],
  { ...OPTIONS["type_mission.je_ne_sais_pas"], hiddenIf: numericRange("age", 16, 25) },
];

export default function DureeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title subtitle="Choisis ce qui te correspond le mieux.">Combien de temps aimerais-tu consacrer à ta mission ?</Title>
      <SingleSelectIcon onChange={handleSelect} options={options} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
