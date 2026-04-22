import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_orientation_rome";

// Catégories simplifiées dérivées du référentiel ONISEP (voir Notion — Étape 7 lycéen / tester_orientation).
const OPTIONS: StepOption[] = [
  { id: "environnement_sciences", label: "🌱 Environnement, nature et sciences", taxonomyKey: "orientation.environnement_sciences" },
  { id: "numerique_communication", label: "💻 Numérique et communication", taxonomyKey: "orientation.numerique_communication" },
  { id: "commerce_gestion", label: "💼 Commerce, gestion, finance et services", taxonomyKey: "orientation.commerce_gestion" },
  { id: "societe_droit", label: "⚖️ Société, droit et politique", taxonomyKey: "orientation.societe_droit" },
  { id: "education_culture", label: "🧑‍🏫 Éducation, culture et création", taxonomyKey: "orientation.education_culture" },
  { id: "social_sante_sport", label: "🌍 Social, santé et sport", taxonomyKey: "orientation.social_sante_sport" },
  { id: "technique_industrie", label: "🛠️ Technique, industrie et construction", taxonomyKey: "orientation.technique_industrie" },
  { id: "securite_logistique", label: "🚓 Sécurité, défense et logistique", taxonomyKey: "orientation.securite_logistique" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "orientation.ne_sais_pas" },
];

export default function PrecisionOrientationRomeStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Vers quoi veux-tu t'orienter ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
