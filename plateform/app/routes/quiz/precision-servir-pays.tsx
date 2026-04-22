import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_servir_pays";

// Spec partielle côté produit — options dérivées au mieux de la note Notion.
// TODO : clarifier "Armée" (branches Marine / Air / Santé — sous-options ou libellés séparés ?).
const OPTIONS: StepOption[] = [
  { id: "armee", label: "Armée", sublabel: "Marine, Air, Santé…", taxonomyKey: "servir_pays.armee" },
  { id: "pompiers", label: "Pompiers", taxonomyKey: "servir_pays.pompiers" },
  { id: "gendarmerie", label: "Gendarmerie", taxonomyKey: "servir_pays.gendarmerie" },
  { id: "police", label: "Police", taxonomyKey: "servir_pays.police" },
  { id: "ne_sais_pas", label: "Je ne sais pas", taxonomyKey: "servir_pays.ne_sais_pas" },
  { id: "aucun", label: "Aucun de ces choix", taxonomyKey: "servir_pays.aucun" },
];

export default function PrecisionServirPaysStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel type d'engagement te parle le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
