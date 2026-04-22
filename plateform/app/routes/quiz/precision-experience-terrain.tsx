import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_experience_terrain";

// Domaine d'études actuelles — catégories simplifiées ONISEP (même grille que precision_orientation_rome).
// Namespace `etudes.*` distinct de `orientation.*` car la sémantique produit est différente
// (formation actuelle vs orientation souhaitée).
const STEP_OPTIONS = [
  OPTIONS["etudes.environnement_sciences"],
  OPTIONS["etudes.numerique_communication"],
  OPTIONS["etudes.commerce_gestion"],
  OPTIONS["etudes.societe_droit"],
  OPTIONS["etudes.education_culture"],
  OPTIONS["etudes.social_sante_sport"],
  OPTIONS["etudes.technique_industrie"],
  OPTIONS["etudes.securite_logistique"],
  OPTIONS["etudes.ne_sais_pas"],
];

export default function PrecisionExperienceTerrainStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quel domaine réalises-tu tes études ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
