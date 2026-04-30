import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
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
  const { setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  return (
    <>
      <Title>Quel secteur d'activité t'attirerait le plus ?</Title>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
