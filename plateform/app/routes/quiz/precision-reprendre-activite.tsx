import { useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import NextButton from "~/components/quiz/next-button";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_reprendre_activite";

// Mapping référentiel ROME — 9 secteurs d'activité (voir Notion — Étape 7 demandeur / reprendre_activite).
const STEP_OPTIONS = [
  OPTIONS["secteur_activite.sante_social_aide_personne"],
  OPTIONS["secteur_activite.education_formation_animation"],
  OPTIONS["secteur_activite.securite_service_public"],
  OPTIONS["secteur_activite.environnement_agriculture"],
  OPTIONS["secteur_activite.culture_creation_medias"],
  OPTIONS["secteur_activite.numerique_communication"],
  OPTIONS["secteur_activite.batiment_industrie_logistique"],
  OPTIONS["secteur_activite.gestion_commerce_organisation"],
  OPTIONS["secteur_activite.je_ne_sais_pas"],
];

export default function PrecisionReprendreActiviteStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSelect = (value: string[]) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids : [];

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    goNext();
  };

  return (
    <>
      <Label>Quel secteur d'activité t'attirerait le plus ?</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
