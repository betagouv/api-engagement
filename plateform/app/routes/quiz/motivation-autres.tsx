import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "motivation_lyceen";

const OPTIONS: StepOption[] = [
  { id: "me_sentir_utile", label: "Me sentir utile, rencontrer de nouvelles personnes", taxonomyKey: "motivation.me_sentir_utile" },
  {
    id: "decouvrir_domaine",
    label: "Découvrir un nouveau domaine",
    sublabel: "Pour me ré-orienter, avoir une expérience pour tester…",
    taxonomyKey: "motivation.decouvrir_domaine",
  },
  { id: "servir_le_pays", label: "Servir le pays", taxonomyKey: "motivation.servir_le_pays" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "motivation.ne_sais_pas" },
];

export default function MotivationLyceenStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleChange = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Qu'est-ce qui te motive le plus ?</h1>
      <SingleSelect onChange={handleChange} options={OPTIONS} />
    </>
  );
}
