import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "motivation_actif";

const OPTIONS: StepOption[] = [
  { id: "me_sentir_utile", label: "Me sentir utile, rencontrer de nouvelles personnes", taxonomyKey: "motivation.me_sentir_utile" },
  {
    id: "competences_interet_general",
    label: "Utiliser mes compétences pour l'intérêt général",
    taxonomyKey: "motivation.competences_interet_general",
  },
  { id: "faire_vivre_valeurs", label: "Faire vivre mes valeurs", taxonomyKey: "motivation.faire_vivre_valeurs" },
  {
    id: "booster_cv",
    label: "Booster mon CV",
    sublabel: "Acquérir des compétences en rapport avec mes études",
    taxonomyKey: "motivation.booster_cv",
  },
  {
    id: "decouvrir_domaine",
    label: "Découvrir un nouveau domaine",
    sublabel: "Ou un nouveau métier, pour tester autre chose",
    taxonomyKey: "motivation.decouvrir_domaine",
  },
  { id: "servir_le_pays", label: "Servir le pays", taxonomyKey: "motivation.servir_le_pays" },
  { id: "partir_etranger", label: "Partir à l'étranger", taxonomyKey: "motivation.partir_etranger" },
  { id: "ne_sais_pas", label: "Je ne sais pas", taxonomyKey: "motivation.ne_sais_pas" },
];

export default function MotivationActifStep() {
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
