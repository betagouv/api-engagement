import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_competences_actuelles";

// Mêmes 7 domaines ROME que precision_competences — mais axe de scoring différent :
// ici on capture les compétences actuelles de l'user pour les matcher à des missions,
// pas ses aspirations de développement.
const STEP_OPTIONS = [
  OPTIONS["competences_actuelles.management_social_soin"],
  OPTIONS["competences_actuelles.communication_creation"],
  OPTIONS["competences_actuelles.production_construction"],
  OPTIONS["competences_actuelles.gestion_pilotage"],
  OPTIONS["competences_actuelles.relation_client"],
  OPTIONS["competences_actuelles.cooperation_organisation"],
  OPTIONS["competences_actuelles.protection"],
];

export default function PrecisionCompetencesActuellesStep() {
  const { setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel est ton domaine de compétences ?</h1>
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
