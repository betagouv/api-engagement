import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_experience_terrain";

// Domaine d'études actuelles — catégories simplifiées ONISEP (même grille que precision_orientation_rome).
// Namespace `etudes.*` distinct de `orientation.*` car la sémantique produit est différente
// (formation actuelle vs orientation souhaitée).
const OPTIONS: StepOption[] = [
  { id: "environnement_sciences", label: "🌱 Environnement, nature et sciences", taxonomyKey: "etudes.environnement_sciences" },
  { id: "numerique_communication", label: "💻 Numérique et communication", taxonomyKey: "etudes.numerique_communication" },
  { id: "commerce_gestion", label: "💼 Commerce, gestion, finance et services", taxonomyKey: "etudes.commerce_gestion" },
  { id: "societe_droit", label: "⚖️ Société, droit et politique", taxonomyKey: "etudes.societe_droit" },
  { id: "education_culture", label: "🧑‍🏫 Éducation, culture et création", taxonomyKey: "etudes.education_culture" },
  { id: "social_sante_sport", label: "🌍 Social, santé et sport", taxonomyKey: "etudes.social_sante_sport" },
  { id: "technique_industrie", label: "🛠️ Technique, industrie et construction", taxonomyKey: "etudes.technique_industrie" },
  { id: "securite_logistique", label: "🚓 Sécurité, défense et logistique", taxonomyKey: "etudes.securite_logistique" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "etudes.ne_sais_pas" },
];

export default function PrecisionExperienceTerrainStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quel domaine réalises-tu tes études ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
