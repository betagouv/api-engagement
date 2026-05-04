import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MultiSelectIcon from "~/components/quiz/multi-select-icon";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const STEP_ID = "precision_formation_onisep";

// Catégories simplifiées dérivées du référentiel ONISEP — 9 domaines.
// Couvre 3 branches motivation (tester_orientation, experience_terrain, preparer_reconversion).
const STEP_OPTIONS = [
  OPTIONS["formation_onisep.environnement_nature_sciences"],
  OPTIONS["formation_onisep.numerique_communication"],
  OPTIONS["formation_onisep.commerce_gestion_finance"],
  OPTIONS["formation_onisep.societe_droit_politique"],
  OPTIONS["formation_onisep.education_culture_creation"],
  OPTIONS["formation_onisep.social_sante_sport"],
  OPTIONS["formation_onisep.technique_industrie_construction"],
  OPTIONS["formation_onisep.securite_defense_logistique"],
  OPTIONS["formation_onisep.je_ne_sais_pas"],
];

const TITLE_BY_MOTIVATION: Record<string, string> = {
  "motivation.experience_terrain": "Dans quel domaine réalises-tu tes études ?",
  "motivation.preparer_reconversion": "Dans quel domaine souhaites-tu préparer ta reconversion ?",
};

const DEFAULT_TITLE = "Vers quoi veux-tu t'orienter ?";

export default function PrecisionFormationOnisepStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext } = useOutletContext<QuizOutletContext>();

  const motivation = answers.motivation;
  const selected = motivation?.type === "options" ? motivation.option_ids : [];
  const title = TITLE_BY_MOTIVATION[selected[0]] ?? DEFAULT_TITLE;

  const handleSelect = (value: string[]) => {
    setAnswer(STEP_ID, { type: "options", option_ids: value });
  };

  return (
    <>
      <Label>{title}</Label>
      <MultiSelectIcon onChange={handleSelect} options={STEP_OPTIONS} selected={selected} />
      <button type="button" onClick={goNext} className="fr-btn fr-btn--lg">
        Continuer
      </button>
    </>
  );
}
