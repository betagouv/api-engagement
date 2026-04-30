import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_domaine";

// Mapping référentiel `domaine` — 9 catégories.
// Couvre 3 branches motivation (decouvrir_domaine, booster_parcoursup, ne_sais_pas).
// Même grille de scoring, le titre est adapté au contexte.
const STEP_OPTIONS = [
  OPTIONS["domaine.social_solidarite"],
  OPTIONS["domaine.education_transmission"],
  OPTIONS["domaine.gestion_projet"],
  OPTIONS["domaine.culture_arts"],
  OPTIONS["domaine.environnement_nature"],
  OPTIONS["domaine.sport_animation"],
  OPTIONS["domaine.sante_soins"],
  OPTIONS["domaine.securite_defense"],
  OPTIONS["domaine.je_ne_sais_pas"],
];

export default function PrecisionDomaineStep() {
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>Dans quel domaine veux-tu aider / avoir une expérience ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
