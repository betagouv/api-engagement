import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, numericRange } from "~/utils/conditions";

const OPTIONS: StepOption[] = [
  { id: "lyceen", label: "Lycéen", taxonomyKey: "statut.lyceen" },
  { id: "etudiant", label: "Étudiant", taxonomyKey: "statut.etudiant" },
  { id: "demandeur_emploi", label: "Demandeur d'emploi", taxonomyKey: "statut.demandeur_emploi" },
  { id: "actif", label: "En activité", taxonomyKey: "statut.actif" },
  {
    id: "retraite",
    label: "Retraité",
    taxonomyKey: "statut.retraite",
    hiddenIf: numericRange("age", 16, 25),
  },
  { id: "autre", label: "Autre", taxonomyKey: "statut.autre" },
];

const STEP_ID = "statut";

export default function StatutStep() {
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
      <h1 className="fr-h3">Quel est ton statut ?</h1>
      <SingleSelect onChange={handleSelect} options={options} />
    </>
  );
}
