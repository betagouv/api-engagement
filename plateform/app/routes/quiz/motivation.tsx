import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import SingleSelectIcon from "~/components/quiz/single-select-icon";
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
  const navigate = useNavigate();
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();
  const [options, setOptions] = useState<StepOption[]>([]);
  const [transitioning, setTransitioning] = useState(false);

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
    setAnswer(STEP_ID, { type: "options", option_ids: [value] });
  };

  if (transitioning) {
    return (
      <div className="tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-6 tw:py-20">
        <div className="tw:size-12 tw:border-4 tw:border-blue-france-sun tw:border-t-transparent tw:rounded-full tw:animate-spin" />
        <p className="fr-h3 tw:mb-0!">On affine ta sélection…</p>
      </div>
    );
  }

  return (
    <>
      <Label subtitle="Choisis une motivation importantes pour toi.">Qu’est-ce qui te motive le plus ?</Label>
      <SingleSelectIcon onChange={handleChange} options={options} />

      <div className="tw:flex tw:flex-col tw:md:flex-row tw:gap-6">
        <button type="button" onClick={() => setTransitioning(true)} className="fr-btn fr-btn--lg">
          Continuer
        </button>
        <button type="button" onClick={() => navigate("/quiz/results")} className="fr-btn fr-btn--lg fr-btn--tertiary">
          Voir les missions sans répondre à toutes les questions
        </button>
      </div>
    </>
  );
}
