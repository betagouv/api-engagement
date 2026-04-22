import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

const STEP_ID = "precision_decouvrir_domaine";

// Mapping référentiel `domain` (mêmes 9 options que precision_parcoursup_domaine).
// Voir Notion — Étape 7 étudiant/actif / decouvrir_domaine.
const STEP_OPTIONS = [
  OPTIONS["domain.social_solidarite"],
  OPTIONS["domain.education_transmission"],
  OPTIONS["domain.gestion_projet"],
  OPTIONS["domain.culture_arts"],
  OPTIONS["domain.environnement_nature"],
  OPTIONS["domain.sport_animation"],
  OPTIONS["domain.sante_soins"],
  OPTIONS["domain.securite_defense"],
  OPTIONS["domain.autre"],
];

export default function PrecisionDecouvrirDomaineStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel domaine t'attire le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={STEP_OPTIONS} />
    </>
  );
}
