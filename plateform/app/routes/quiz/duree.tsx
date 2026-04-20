import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";

const OPTIONS: StepOption[] = [
  { id: "ponctuelle", label: "Mission ponctuelle", taxonomyKey: "duree.ponctuelle" },
  { id: "reguliere", label: "Mission régulière", taxonomyKey: "duree.reguliere" },
  { id: "temps_plein", label: "Mission à temps plein", taxonomyKey: "duree.temps_plein" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "duree.ne_sais_pas", hiddenIf: numericRange("age", 16, 25) },
];

const STEP_ID = "duree";

export default function DureeStep() {
  const { answers, setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();
  const [options, setOptions] = useState<StepOption[]>([]);

  useEffect(() => {
    const visibleOptions = OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Combien de temps aimerais-tu consacrer à une mission ?</h1>
      <SingleSelect onChange={handleSelect} options={options} />
    </>
  );
}
