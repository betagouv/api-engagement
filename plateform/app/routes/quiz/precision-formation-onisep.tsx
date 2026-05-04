import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import NextButton from "~/components/quiz/next-button";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_formation_onisep";

// Catégories simplifiées dérivées du référentiel ONISEP — 9 domaines.
// Couvre 3 branches motivation (tester_orientation, experience_terrain, preparer_reconversion).
const STEP_OPTIONS = [
  OPTIONS["formation_onisep.environnement_nature_sciences"],
  OPTIONS["formation_onisep.numerique_communication"],
  OPTIONS["formation_onisep.commerce_gestion_finance"],
  OPTIONS["formation_onisep.societe_droit_politique"],
  OPTIONS["formation_onisep.education_culture_creation"],
  OPTIONS["formation_onisep.social_sante_sport"],
  OPTIONS["formation_onisep.technique_industrie_construction"],
  OPTIONS["formation_onisep.securite_defense_logistique"],
  OPTIONS["formation_onisep.je_ne_sais_pas"],
];

const TITLE_BY_MOTIVATION: Record<string, string> = {
  "motivation.experience_terrain": "Dans quel domaine réalises-tu tes études ?",
  "motivation.preparer_reconversion": "Dans quel domaine souhaites-tu préparer ta reconversion ?",
};

const DEFAULT_TITLE = "Vers quoi veux-tu t'orienter ?";

export default function PrecisionFormationOnisepStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);

  const motivationId = answers.motivation?.type === "options" ? answers.motivation.option_ids[0] : "";
  const title = TITLE_BY_MOTIVATION[motivationId] ?? DEFAULT_TITLE;
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <Label>{title}</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
