import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";

const STEP_ID = "duree";

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["duree.ponctuelle"],
  OPTIONS["duree.reguliere"],
  OPTIONS["duree.temps_plein"],
  { ...OPTIONS["duree.ne_sais_pas"], hiddenIf: numericRange("age", 16, 25) },
];

export default function DureeStep() {
  const { answers, setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();
  const [options, setOptions] = useState<StepOption[]>([]);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Combien de temps aimerais-tu consacrer à une mission ?</h1>
      <SingleSelect onChange={handleSelect} options={options} />
    </>
  );
}
