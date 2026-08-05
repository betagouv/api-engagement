import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import NextButton from "~/components/quiz/next-button";
import RadioGroupRich from "~/components/quiz/radio-group-rich";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, not, or, screenAnswer } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "motivation";

const lyceen = screenAnswer("statut", "lyceen");
const etudiant = screenAnswer("statut", "etudiant");
const demandeurEmploi = screenAnswer("statut", "demandeur_emploi");
const actif = screenAnswer("statut", "actif");

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["motivation.me_sentir_utile"],
  { ...OPTIONS["motivation.booster_parcoursup"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.tester_orientation"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.booster_cv"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.decouvrir_domaine"], hiddenIf: or(lyceen, demandeurEmploi) },
  { ...OPTIONS["motivation.experience_terrain"], hiddenIf: not(etudiant) },
  { ...OPTIONS["motivation.partir_etranger"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.competences_interet_general"], hiddenIf: not(actif) },
  { ...OPTIONS["motivation.reprendre_confiance"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.reprendre_activite"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.enrichir_cv"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.preparer_reconversion"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.servir_le_pays"] },
  { ...OPTIONS["motivation.ne_sais_pas"] },
];

const DEFAULT_TITLE = "Qu’est-ce qui te motive le plus ?";
const DEFAULT_SUBTITLE = "Choisis une motivation importante pour toi.";

export default function MotivationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const selected = answers[STEP_ID]?.type === "options" ? answers[STEP_ID].option_ids[0] : undefined;

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleChange = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", taxonomy: "motivation", option_ids: [value] });
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    saveScoring();
    goNext();
  };

  return (
    <>
      <RadioGroupRich title={DEFAULT_TITLE} subtitle={DEFAULT_SUBTITLE} onChange={handleChange} options={options} error={error} selected={selected} required />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
