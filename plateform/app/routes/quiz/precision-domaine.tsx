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

const TITLE_BY_MOTIVATION: Record<string, string> = {
  "motivation.booster_parcoursup": "Dans quel domaine aimerais-tu avoir une expérience ?",
  "motivation.ne_sais_pas": "Est-ce qu'un domaine te plaît plus qu'un autre ?",
};

const DEFAULT_TITLE = "Quel domaine t'attire le plus ?";

export default function PrecisionDomaineStep() {
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
