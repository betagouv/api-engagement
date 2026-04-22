import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_reconversion";

// Mapping ONISEP — 8 domaines + "ne sais pas" (même grille que precision_experience_terrain).
// Namespace `reconversion.*` distinct : domaine visé pour une reconversion, pas le domaine d'études actuel.
const STEP_OPTIONS = [
  OPTIONS["reconversion.environnement_sciences"],
  OPTIONS["reconversion.numerique_communication"],
  OPTIONS["reconversion.commerce_gestion"],
  OPTIONS["reconversion.societe_droit"],
  OPTIONS["reconversion.education_culture"],
  OPTIONS["reconversion.social_sante_sport"],
  OPTIONS["reconversion.technique_industrie"],
  OPTIONS["reconversion.securite_logistique"],
  OPTIONS["reconversion.ne_sais_pas"],
];

export default function PrecisionReconversionStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quel domaine souhaites-tu préparer ta reconversion ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
