import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import SingleSelect from "~/components/quiz/single-select";
import Title from "~/components/quiz/title";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { StepOption } from "~/types/quiz";
import { evalCondition, not, or, screenAnswer } from "~/utils/conditions";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "motivation";

const lyceen = screenAnswer("statut", "statut.lyceen");
const etudiant = screenAnswer("statut", "statut.etudiant");
const demandeurEmploi = screenAnswer("statut", "statut.demandeur_emploi");
const actif = screenAnswer("statut", "statut.actif");

const STEP_OPTIONS: StepOption[] = [
  OPTIONS["motivation.me_sentir_utile"],
  { ...OPTIONS["motivation.booster_parcoursup"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.tester_orientation"], hiddenIf: not(lyceen) },
  { ...OPTIONS["motivation.booster_cv"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.decouvrir_domaine"], hiddenIf: or(lyceen, demandeurEmploi) },
  { ...OPTIONS["motivation.experience_terrain"], hiddenIf: not(etudiant) },
  { ...OPTIONS["motivation.partir_etranger"], hiddenIf: not(or(etudiant, actif)) },
  { ...OPTIONS["motivation.competences_interet_general"], hiddenIf: not(actif) },
  { ...OPTIONS["motivation.faire_vivre_valeurs"], hiddenIf: not(actif) },
  { ...OPTIONS["motivation.reprendre_confiance"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.reprendre_activite"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.enrichir_cv"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.preparer_reconversion"], hiddenIf: not(demandeurEmploi) },
  { ...OPTIONS["motivation.servir_le_pays"], hiddenIf: demandeurEmploi },
  { ...OPTIONS["motivation.ne_sais_pas"], hiddenIf: demandeurEmploi },
];

export default function MotivationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);

  useEffect(() => {
    const visibleOptions = STEP_OPTIONS.filter((o) => !o.hiddenIf || !evalCondition(o.hiddenIf, answers));
    setOptions(visibleOptions);
  }, [answers]);

  const handleChange = (value: string) => {
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
    goNext();
  };

  return (
    <>
      <Title>Qu'est-ce qui te motive le plus ?</Title>
      <SingleSelect onChange={handleChange} options={options} />
      <div className="fr-mt-4w tw:flex tw:flex-col tw:sm:flex-row tw:gap-4 tw:items-center">
        <button type="button" className="fr-btn tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goNext}>
          Continuer
        </button>
        <button type="button" className="fr-btn fr-btn--secondary tw:w-full! tw:sm:w-auto! tw:justify-center!" onClick={goBack}>
          Retour
        </button>
      </div>
    </>
  );
}
