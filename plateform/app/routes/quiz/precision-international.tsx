import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_international";

// Régions du monde. Condition de visibilité dans QUIZ_FLOW : masqué si `duree = ponctuelle`.
const OPTIONS: StepOption[] = [
  { id: "europe", label: "Europe", taxonomyKey: "international.europe" },
  { id: "afrique", label: "Afrique", taxonomyKey: "international.afrique" },
  { id: "amerique", label: "Amérique", taxonomyKey: "international.amerique" },
  { id: "asie", label: "Asie", taxonomyKey: "international.asie" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "international.ne_sais_pas" },
];

export default function PrecisionInternationalStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quelle région du monde souhaiterais-tu partir ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
