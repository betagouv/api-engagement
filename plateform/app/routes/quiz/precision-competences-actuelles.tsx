import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_competences_actuelles";

// Mêmes 7 domaines ROME que precision_competences — mais axe de scoring différent :
// ici on capture les compétences actuelles de l'user pour les matcher à des missions,
// pas ses aspirations de développement.
const OPTIONS: StepOption[] = [
  {
    id: "management_social_soin",
    label: "Management, social, soin",
    sublabel: "Aider, accompagner ou prendre soin des autres",
    taxonomyKey: "competences_actuelles.management_social_soin",
  },
  {
    id: "communication_creation",
    label: "Communication, création, innovation, nouvelles technologies",
    sublabel: "Communiquer, créer ou travailler avec le numérique",
    taxonomyKey: "competences_actuelles.communication_creation",
  },
  {
    id: "production_construction",
    label: "Production, construction, qualité, logistique",
    sublabel: "Fabriquer, concevoir, construire ou travailler avec des outils et des machines",
    taxonomyKey: "competences_actuelles.production_construction",
  },
  {
    id: "gestion_pilotage",
    label: "Gestion, pilotage, juridique",
    sublabel: "Gérer une activité, un projet ou des ressources",
    taxonomyKey: "competences_actuelles.gestion_pilotage",
  },
  {
    id: "relation_client",
    label: "Relation client, commerce, stratégie",
    sublabel: "Développer une activité économique ou commerciale",
    taxonomyKey: "competences_actuelles.relation_client",
  },
  {
    id: "cooperation_organisation",
    label: "Coopération, organisation, soft skills",
    sublabel: "Travailler en équipe et développer ses compétences personnelles",
    taxonomyKey: "competences_actuelles.cooperation_organisation",
  },
  {
    id: "protection",
    label: "Protection des personnes, de la société ou de l'environnement",
    sublabel: "Sécurité, environnement, action publique",
    taxonomyKey: "competences_actuelles.protection",
  },
];

export default function PrecisionCompetencesActuellesStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Quel est ton domaine de compétences ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
