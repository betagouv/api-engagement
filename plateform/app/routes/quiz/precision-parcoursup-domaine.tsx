import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_parcoursup_domaine";

// Mapping référentiel `domain` (voir Notion — Étape 7 lycéen / booster_parcoursup).
const OPTIONS: StepOption[] = [
  {
    id: "social_solidarite",
    label: "Social et solidarité",
    sublabel: "Aide aux personnes en difficulté, distribution alimentaire, accompagnement",
    taxonomyKey: "domain.social_solidarite",
  },
  {
    id: "education_transmission",
    label: "Éducation et transmission",
    sublabel: "Enseignement, animation, aide aux devoirs, citoyenneté",
    taxonomyKey: "domain.education_transmission",
  },
  {
    id: "gestion_projet",
    label: "Gestion de projet",
    sublabel: "Partenariat, communication, responsabilités, tâches administratives",
    taxonomyKey: "domain.gestion_projet",
  },
  {
    id: "culture_arts",
    label: "Culture et arts",
    sublabel: "Médiation culturelle, événements artistiques, valorisation du patrimoine",
    taxonomyKey: "domain.culture_arts",
  },
  {
    id: "environnement_nature",
    label: "Environnement et nature",
    sublabel: "Protection de la biodiversité, actions écologiques",
    taxonomyKey: "domain.environnement_nature",
  },
  {
    id: "sport_animation",
    label: "Sport et animation sportive",
    sublabel: "Encadrement d'activités, organisation d'événements, promotion du sport",
    taxonomyKey: "domain.sport_animation",
  },
  {
    id: "sante_soins",
    label: "Santé et soins",
    sublabel: "Accompagnement des patients, prévention santé, aide aux personnes dépendantes",
    taxonomyKey: "domain.sante_soins",
  },
  {
    id: "securite_defense",
    label: "Sécurité et défense",
    sublabel: "Protection des populations, secours en personnes",
    taxonomyKey: "domain.securite_defense",
  },
  { id: "autre", label: "Autre", taxonomyKey: "domain.autre" },
];

export default function PrecisionParcoursupDomaineStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Dans quel domaine aimerais-tu avoir une expérience ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
