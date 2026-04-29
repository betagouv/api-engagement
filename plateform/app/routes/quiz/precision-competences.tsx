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

const TITLE_BY_MOTIVATION: Record<string, string> = {
  "motivation.competences_interet_general": "Quel est ton domaine de compétences ?",
};

const DEFAULT_TITLE = "Quel domaine de compétences t'attire le plus ?";

export default function PrecisionCompetencesStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const motivation = answers.motivation;
  const selected = motivation?.type === "options" ? motivation.option_ids[0] : "";
  const title = TITLE_BY_MOTIVATION[selected] ?? DEFAULT_TITLE;

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <Title>{title}</Title>
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
