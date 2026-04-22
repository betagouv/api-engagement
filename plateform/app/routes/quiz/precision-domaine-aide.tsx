import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_domaine_aide";

// Mapping référentiel `engagement_intent` (voir Notion — Étape 7 lycéen / me_sentir_utile).
const STEP_OPTIONS = [
  OPTIONS["engagement_intent.aide_directe"],
  OPTIONS["engagement_intent.transmission"],
  OPTIONS["engagement_intent.animation"],
  OPTIONS["engagement_intent.action_terrain"],
  OPTIONS["engagement_intent.secours"],
  OPTIONS["engagement_intent.cadre_engage"],
  OPTIONS["engagement_intent.support_organisation"],
  OPTIONS["engagement_intent.exploration"],
];

export default function PrecisionDomaineAideStep() {
  const { setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Parmi ces choix, quelle thématique te parle le plus ?</h1>
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
