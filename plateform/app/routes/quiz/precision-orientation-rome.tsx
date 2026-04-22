import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_orientation_rome";

// Catégories simplifiées dérivées du référentiel ONISEP (voir Notion — Étape 7 lycéen / tester_orientation).
const STEP_OPTIONS = [
  OPTIONS["orientation.environnement_sciences"],
  OPTIONS["orientation.numerique_communication"],
  OPTIONS["orientation.commerce_gestion"],
  OPTIONS["orientation.societe_droit"],
  OPTIONS["orientation.education_culture"],
  OPTIONS["orientation.social_sante_sport"],
  OPTIONS["orientation.technique_industrie"],
  OPTIONS["orientation.securite_logistique"],
  OPTIONS["orientation.ne_sais_pas"],
];

export default function PrecisionOrientationRomeStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Vers quoi veux-tu t'orienter ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
