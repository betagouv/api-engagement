import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_competences_actuelles";

// Mêmes 7 domaines ROME que precision_competences — mais axe de scoring différent :
// ici on capture les compétences actuelles de l'user pour les matcher à des missions,
// pas ses aspirations de développement.
const STEP_OPTIONS = [
  OPTIONS["competence_rome.management_social_soin"],
  OPTIONS["competence_rome.communication_creation_numerique"],
  OPTIONS["competence_rome.production_construction_qualite_logistique"],
  OPTIONS["competence_rome.gestion_pilotage_juridique"],
  OPTIONS["competence_rome.relation_client_commerce_strategie"],
  OPTIONS["competence_rome.cooperation_organisation_soft_skills"],
  OPTIONS["competence_rome.securite_environnement_action_publique"],
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
      <Title>Quel est ton domaine de compétences ?</Title>
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
