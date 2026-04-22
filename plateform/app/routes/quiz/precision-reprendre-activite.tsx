import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_reprendre_activite";

// Mapping référentiel ROME — 9 secteurs d'activité (voir Notion — Étape 7 demandeur / reprendre_activite).
const STEP_OPTIONS = [
  OPTIONS["secteurs.sante_social_aide"],
  OPTIONS["secteurs.education_formation_animation"],
  OPTIONS["secteurs.securite_service_public"],
  OPTIONS["secteurs.environnement_agriculture"],
  OPTIONS["secteurs.culture_creation_medias"],
  OPTIONS["secteurs.numerique_communication"],
  OPTIONS["secteurs.batiment_industrie_logistique"],
  OPTIONS["secteurs.gestion_commerce_organisation"],
  OPTIONS["secteurs.ne_sais_pas"],
];

export default function PrecisionReprendreActiviteStep() {
  const { setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel secteur d'activité t'attirerait le plus ?</h1>
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
