import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "motivation_etudiant";

const OPTIONS: StepOption[] = [
  { id: "me_sentir_utile", label: "Me sentir utile, rencontrer de nouvelles personnes", taxonomyKey: "motivation.me_sentir_utile" },
  {
    id: "booster_cv",
    label: "Booster mon CV",
    sublabel: "Acquérir des compétences en rapport avec mes études",
    taxonomyKey: "motivation.booster_cv",
  },
  {
    id: "decouvrir_domaine",
    label: "Découvrir un nouveau domaine",
    sublabel: "Pour me ré-orienter, avoir une expérience pour tester…",
    taxonomyKey: "motivation.decouvrir_domaine",
  },
  { id: "experience_terrain", label: "Avoir une 1ère expérience terrain", taxonomyKey: "motivation.experience_terrain" },
  { id: "servir_le_pays", label: "Servir le pays", taxonomyKey: "motivation.servir_le_pays" },
  { id: "partir_etranger", label: "Partir à l'étranger", taxonomyKey: "motivation.partir_etranger" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "motivation.ne_sais_pas" },
];

export default function MotivationEtudiantStep() {
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
