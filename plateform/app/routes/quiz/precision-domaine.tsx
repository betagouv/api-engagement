import { useOutletContext } from "react-router";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
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
  "motivation.ne_sais_pas": "Est-ce qu'un domaine te plaît plus qu'un autre ?",
  "motivation.decouvrir_domaine": "Quel domaine t'attirerait le plus ?",
};

const DEFAULT_TITLE = "Dans quel domaine aimerais-tu avoir une expérience ?";

export default function PrecisionDomaineStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const motivation = answers.motivation;
  const selected = motivation?.type === "options" ? motivation.option_ids : [];
  const title = TITLE_BY_MOTIVATION[selected[0]] ?? DEFAULT_TITLE;

  const handleSelect = (value: string[]) => {
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };
  return (
    <>
      <Title>{title}</Title>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
