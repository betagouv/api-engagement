import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_reconversion";

// Mapping ONISEP — 8 domaines + "ne sais pas" (même grille que precision_experience_terrain).
// Namespace `reconversion.*` distinct : domaine visé pour une reconversion, pas le domaine d'études actuel.
const OPTIONS: StepOption[] = [
  { id: "environnement_sciences", label: "🌱 Environnement, nature et sciences", taxonomyKey: "reconversion.environnement_sciences" },
  { id: "numerique_communication", label: "💻 Numérique et communication", taxonomyKey: "reconversion.numerique_communication" },
  { id: "commerce_gestion", label: "💼 Commerce, gestion, finance et services", taxonomyKey: "reconversion.commerce_gestion" },
  { id: "societe_droit", label: "⚖️ Société, droit et politique", taxonomyKey: "reconversion.societe_droit" },
  { id: "education_culture", label: "🧑‍🏫 Éducation, culture et création", taxonomyKey: "reconversion.education_culture" },
  { id: "social_sante_sport", label: "🌍 Social, santé et sport", taxonomyKey: "reconversion.social_sante_sport" },
  { id: "technique_industrie", label: "🛠️ Technique, industrie et construction", taxonomyKey: "reconversion.technique_industrie" },
  { id: "securite_logistique", label: "🚓 Sécurité, défense et logistique", taxonomyKey: "reconversion.securite_logistique" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "reconversion.ne_sais_pas" },
];

export default function PrecisionReconversionStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quel domaine souhaites-tu préparer ta reconversion ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
