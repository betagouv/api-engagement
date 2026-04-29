import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_parcoursup_domaine";

// Mapping référentiel `domaine` (voir Notion — Étape 7 lycéen / booster_parcoursup).
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

export default function PrecisionParcoursupDomaineStep() {
  const { setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <Title>Dans quel domaine aimerais-tu avoir une expérience ?</Title>
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
