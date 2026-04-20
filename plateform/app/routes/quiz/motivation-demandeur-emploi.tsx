import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "motivation_demandeur_emploi";

const OPTIONS: StepOption[] = [
  { id: "me_sentir_utile", label: "Me sentir utile, rencontrer de nouvelles personnes", taxonomyKey: "motivation.me_sentir_utile" },
  { id: "reprendre_confiance", label: "Reprendre confiance en moi", taxonomyKey: "motivation.reprendre_confiance" },
  { id: "reprendre_activite", label: "Garder / reprendre une activité", taxonomyKey: "motivation.reprendre_activite" },
  {
    id: "enrichir_cv",
    label: "Enrichir mon CV",
    sublabel: "Acquérir des compétences en rapport avec mon métier",
    taxonomyKey: "motivation.enrichir_cv",
  },
  {
    id: "preparer_reconversion",
    label: "Préparer une reconversion professionnelle",
    sublabel: "Tester un nouveau domaine / métier",
    taxonomyKey: "motivation.preparer_reconversion",
  },
];

export default function MotivationDemandeurEmploiStep() {
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
