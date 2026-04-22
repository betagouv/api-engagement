import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_reprendre_activite";

// Mapping référentiel ROME — 9 secteurs d'activité (voir Notion — Étape 7 demandeur / reprendre_activite).
const OPTIONS: StepOption[] = [
  { id: "sante_social_aide", label: "Santé, social et aide à la personne", taxonomyKey: "secteurs.sante_social_aide" },
  { id: "education_formation_animation", label: "Éducation, formation et animation", taxonomyKey: "secteurs.education_formation_animation" },
  { id: "securite_service_public", label: "Sécurité et service public", taxonomyKey: "secteurs.securite_service_public" },
  { id: "environnement_agriculture", label: "Environnement et agriculture", taxonomyKey: "secteurs.environnement_agriculture" },
  { id: "culture_creation_medias", label: "Culture, création et médias", taxonomyKey: "secteurs.culture_creation_medias" },
  { id: "numerique_communication", label: "Numérique et communication", taxonomyKey: "secteurs.numerique_communication" },
  { id: "batiment_industrie_logistique", label: "Bâtiment, industrie et logistique", taxonomyKey: "secteurs.batiment_industrie_logistique" },
  { id: "gestion_commerce_organisation", label: "Gestion, commerce et organisation", taxonomyKey: "secteurs.gestion_commerce_organisation" },
  { id: "ne_sais_pas", label: "Je ne sais pas encore", taxonomyKey: "secteurs.ne_sais_pas" },
];

export default function PrecisionReprendreActiviteStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel secteur d'activité t'attirerait le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
