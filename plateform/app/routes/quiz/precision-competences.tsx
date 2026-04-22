import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_competences";

// Mapping référentiel ROME — 7 domaines de compétences.
// Voir Notion — Étape 7 étudiant / booster_cv.
const STEP_OPTIONS = [
  OPTIONS["competences.management_social_soin"],
  OPTIONS["competences.communication_creation"],
  OPTIONS["competences.production_construction"],
  OPTIONS["competences.gestion_pilotage"],
  OPTIONS["competences.relation_client"],
  OPTIONS["competences.cooperation_organisation"],
  OPTIONS["competences.protection"],
];

export default function PrecisionCompetencesStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel domaine de compétences t'attire le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
