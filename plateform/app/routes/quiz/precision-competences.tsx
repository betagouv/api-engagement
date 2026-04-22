import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

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
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel domaine de compétences t'attire le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <div className="fr-mt-4w tw:flex tw:flex-col tw:sm:flex-row tw:gap-4 tw:items-center">
        <button type="button" className="fr-btn tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goNext}>
          Continuer
        </button>
        <button type="button" className="fr-btn fr-btn--secondary tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goBack}>
          Retour
        </button>
      </div>
    </>
  );
}
