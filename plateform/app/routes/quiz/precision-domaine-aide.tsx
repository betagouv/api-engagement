import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";

const STEP_ID = "precision_domaine_aide";

// Mapping référentiel `engagement_intent` (voir Notion — Étape 7 lycéen / me_sentir_utile).
const OPTIONS: StepOption[] = [
  { id: "aide_directe", label: "🤝 Aide directe aux personnes", taxonomyKey: "engagement_intent.aide_directe" },
  {
    id: "transmission",
    label: "🎓 Transmission / pédagogie / accompagnement de public",
    taxonomyKey: "engagement_intent.transmission",
  },
  { id: "animation", label: "🎉 Animation d'actions ou de collectif", taxonomyKey: "engagement_intent.animation" },
  {
    id: "action_terrain",
    label: "🌱 Action terrain concrète",
    sublabel: "Collecte, distribution, fabrication…",
    taxonomyKey: "engagement_intent.action_terrain",
  },
  { id: "secours", label: "🚒 Secours / intervention", taxonomyKey: "engagement_intent.secours" },
  { id: "cadre_engage", label: "🪖 Engagement en cadre structuré", taxonomyKey: "engagement_intent.cadre_engage" },
  {
    id: "support_organisation",
    label: "🧠 Organisation / gestion de projet / communication",
    taxonomyKey: "engagement_intent.support_organisation",
  },
  { id: "exploration", label: "🤷 Je ne sais pas", taxonomyKey: "engagement_intent.exploration" },
];

export default function PrecisionDomaineAideStep() {
  const { setAnswer } = useQuizStore();
  const goNext = useOutletContext<() => void>();

  const handleSelect = (optionId: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [optionId] });
    goNext();
  };

  return (
    <>
      <h1 className="fr-h3">Parmi ces choix, quelle thématique te parle le plus ?</h1>
      <SingleSelect onChange={handleSelect} options={OPTIONS} />
    </>
  );
}
