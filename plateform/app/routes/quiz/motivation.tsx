import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MissionCard from "~/components/quiz/mission-card";
import NextButton from "~/components/quiz/next-button";
import SingleSelectIcon from "~/components/quiz/single-select-icon";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, not, or, screenAnswer } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

import Photo1 from "~/assets/images/humanitaire-02.jpeg";

const STEP_ID = "motivation";

const lyceen = screenAnswer("statut", "statut.lyceen");
const etudiant = screenAnswer("statut", "statut.etudiant");
const demandeurEmploi = screenAnswer("statut", "statut.demandeur_emploi");
const actif = screenAnswer("statut", "statut.actif");
const retraite = screenAnswer("statut", "statut.retraite");

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["motivation.me_sentir_utile"],
  { ...OPTIONS["motivation.booster_parcoursup"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.tester_orientation"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.booster_cv"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.decouvrir_domaine"], hiddenIf: or(lyceen, demandeurEmploi) },
  { ...OPTIONS["motivation.experience_terrain"], hiddenIf: not(etudiant) },
  { ...OPTIONS["motivation.partir_etranger"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.competences_interet_general"], hiddenIf: not(or(actif, retraite)) },
  { ...OPTIONS["motivation.reprendre_confiance"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.reprendre_activite"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.enrichir_cv"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.preparer_reconversion"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.servir_le_pays"] },
  { ...OPTIONS["motivation.ne_sais_pas"] },
];

export default function MotivationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, transitioning, setTransitioning } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  useEffect(() => {
    if (!transitioning) return;
    const timer = setTimeout(() => goNext(), 2000);
    return () => clearTimeout(timer);
  }, [transitioning, goNext]);

  const handleChange = (value: string) => {
    setError(undefined);
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  const handleNext = () => {
    const answer = answers[STEP_ID];
    if (answer?.type !== "options" || answer.option_ids.length === 0) {
      setError("Sélectionne une réponse");
      return;
    }
    setTransitioning(true);
  };

  if (transitioning) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <div className="h-[360px] relative gap-4">
          <MissionCard
            imageSrc={Photo1}
            title="Participer à l'information du public concernant l'accès aux droits…"
            size="sm"
            className="absolute -top-12 left-1/2 -translate-x-[40%] rotate-[8deg]"
          />
          <MissionCard
            imageSrc={Photo1}
            title="Améliorer la qualité de vie des personnes en situation de handicap"
            size="sm"
            className="absolute top-0 left-1/2 -translate-x-[80%] rotate-[-4deg]"
          />
          <MissionCard imageSrc={Photo1} title="Je deviens infirmier pompier volontaire 🚒" size="sm" className="absolute top-16 left-1/2 -translate-x-1/2 rotate-[3deg]" />
        </div>
        <p className="fr-h1 mb-0!">On affine ta sélection</p>
      </div>
    );
  }

  return (
    <>
      <Label subtitle="Choisis une motivation importantes pour toi.">Qu’est-ce qui te motive le plus ?</Label>
      <SingleSelectIcon onChange={handleChange} options={options} error={error} />
      <NextButton onClick={handleNext} skip />
    </>
  );
}
