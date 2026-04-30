import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_competences";

// Mapping référentiel ROME — 7 domaines de compétences.
// La sémantique varie selon la motivation : "ce que je veux développer" (booster_cv / enrichir_cv)
// vs. "ce que je sais déjà faire" (competences_interet_general). Même grille, titre adapté.
const STEP_OPTIONS = [
  OPTIONS["competence_rome.management_social_soin"],
  OPTIONS["competence_rome.communication_creation_numerique"],
  OPTIONS["competence_rome.production_construction_qualite_logistique"],
  OPTIONS["competence_rome.gestion_pilotage_juridique"],
  OPTIONS["competence_rome.relation_client_commerce_strategie"],
  OPTIONS["competence_rome.cooperation_organisation_soft_skills"],
  OPTIONS["competence_rome.securite_environnement_action_publique"],
];

export default function PrecisionCompetencesStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>Quel type de compétences t'attire le plus ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
