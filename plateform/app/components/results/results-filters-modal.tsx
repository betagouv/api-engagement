import { useId, useState } from "react";
import { Link } from "react-router";
import Modal from "~/components/layout/modal";
import MissionTag from "~/components/missions/mission-tag";
import FilterOptionRows, { type FilterOptionsProps } from "~/components/results/filter-option-rows";
import { QUIZ_FLOW, type StepId } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { FILTERS, FILTER_STEP_IDS } from "~/config/results-filters";
import { saveQuizScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";

interface ResultsFiltersModalProps {
  userScoringId: string | undefined;
  // Lien « Refaire le test » : renvoie vers le dernier step visible du quiz.
  quizHref: string;
  // Appelé après la mise à jour du scoring : la page recharge les résultats (retour page 1).
  onResultsChange: () => void;
}

// Version mobile : bouton « Modifier mes critères » + modale reprenant les réponses hors filtres
// (« Ce qu'on a compris de toi ») et les critères de mission en accordéons. Les sélections restent
// dans un brouillon local tant que « Sauvegarder mes réponses » n'est pas cliqué.
export default function ResultsFiltersModal({ userScoringId, quizHref, onResultsChange }: ResultsFiltersModalProps) {
  const answers = useQuizStore((s) => s.answers);
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<StepId, string[]>>>({});
  const [openSections, setOpenSections] = useState<Partial<Record<StepId, boolean>>>({});
  // Les deux cartes de la modale sont repliables, dépliées par défaut.
  const [understoodOpen, setUnderstoodOpen] = useState(true);
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const reactId = useId();

  const handleOpen = () => {
    // Brouillon initialisé depuis le store : les cases cochées reflètent les réponses courantes.
    setDraft(
      Object.fromEntries(
        FILTERS.map((filter) => {
          const answer = answers[filter.stepId];
          return [filter.stepId, answer?.type === "options" ? answer.option_ids : []];
        }),
      ) as Partial<Record<StepId, string[]>>,
    );
    setOpenSections({});
    setUnderstoodOpen(true);
    setCriteriaOpen(true);
    setSaveError(false);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!userScoringId || loading) return;
    for (const filter of FILTERS) {
      setAnswer(filter.stepId, { type: "options", taxonomy: filter.stepId, option_ids: draft[filter.stepId] ?? [] });
    }
    setLoading(true);
    try {
      await saveQuizScoring(userScoringId);
      setSaveError(false);
      onResultsChange();
      setOpen(false);
    } catch {
      setSaveError(true);
    } finally {
      setLoading(false);
    }
  };

  // Réponses hors filtres (âge, handicap, localisation, motivations) résumées en tags.
  const understoodLabels = QUIZ_FLOW.flatMap((step) => {
    if (FILTER_STEP_IDS.has(step.id)) return [];
    const answer = answers[step.id];
    if (!answer) return [];
    if (step.id === "handicap") {
      const optionId = answer.type === "options" ? answer.option_ids[0] : undefined;
      if (optionId === "non") return ["Pas de handicap"];
      if (optionId === "oui") return ["En situation de handicap"];
      return [];
    }
    if (answer.type === "numeric") return [`${answer.value} ans`];
    if (answer.type === "params") return typeof answer.params.label === "string" ? [answer.params.label] : [];
    if (answer.type === "options") return answer.option_ids.map((optionId) => OPTIONS[`${answer.taxonomy}.${optionId}` as keyof typeof OPTIONS]?.label ?? optionId);
    return [];
  });

  return (
    <>
      <button type="button" className="w-full! fr-btn fr-btn--secondary fr-icon-equalizer-line fr-btn--icon-left w-full justify-center" onClick={handleOpen}>
        Modifier mes critères
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Modifier mes réponses" className="rounded-t-3xl">
        <div className="rounded-lg bg-blue-france-975 p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2"
            aria-expanded={understoodOpen}
            aria-controls={`${reactId}-understood`}
            onClick={() => setUnderstoodOpen((value) => !value)}
          >
            <span className="font-bold text-title-grey">Ce qu’on a compris de toi</span>
            <i className={`fr-icon-arrow-down-s-line text-blue-france-sun transition-transform ${understoodOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {understoodOpen && (
            <div id={`${reactId}-understood`} className="mt-3 flex flex-col gap-3">
              {understoodLabels.length > 0 && (
                <ul className="m-0! flex list-none! flex-wrap gap-2 p-0!">
                  {understoodLabels.map((label, index) => (
                    <li key={`${index}-${label}`} className="m-0! p-0!">
                      <MissionTag>{label}</MissionTag>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={quizHref} className="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-pencil-line fr-btn--icon-left w-full justify-center w-full!">
                Refaire le test
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border-default-grey p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2"
            aria-expanded={criteriaOpen}
            aria-controls={`${reactId}-criteria`}
            onClick={() => setCriteriaOpen((value) => !value)}
          >
            <span className="font-bold text-title-grey">Modifie les critères de ta mission</span>
            <i className={`fr-icon-arrow-down-s-line text-blue-france-sun transition-transform ${criteriaOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {criteriaOpen && (
            <div id={`${reactId}-criteria`} className="mt-3">
              {FILTERS.map((filter) => (
                <FilterAccordion
                  key={filter.stepId}
                  filter={filter}
                  selected={draft[filter.stepId] ?? []}
                  open={openSections[filter.stepId] === true}
                  onToggle={() => setOpenSections((prev) => ({ ...prev, [filter.stepId]: prev[filter.stepId] !== true }))}
                  onChange={(next) => setDraft((prev) => ({ ...prev, [filter.stepId]: next }))}
                />
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <p role="alert" className="fr-error-text">
            Impossible de mettre à jour tes filtres. Réessaie plus tard.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="fr-btn w-full justify-center w-full!" disabled={loading} onClick={handleSave}>
            Sauvegarder mes réponses
          </button>
          <button type="button" className="fr-btn fr-btn--tertiary w-full justify-center w-full!" onClick={() => setOpen(false)}>
            Annuler
          </button>
        </div>
      </Modal>
    </>
  );
}

interface FilterAccordionProps extends FilterOptionsProps {
  open: boolean;
  onToggle: () => void;
}

function FilterAccordion({ filter, selected, open, onToggle, onChange }: FilterAccordionProps) {
  const reactId = useId();
  const panelId = `${reactId}-panel`;

  return (
    <div className="py-3">
      <button type="button" className="flex w-full items-center justify-between gap-2" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="font-bold text-title-grey">{filter.placeholder}</span>
        <i className={`fr-icon-arrow-down-s-line text-blue-france-sun transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <fieldset id={panelId} className="mt-2 w-full">
          <legend className="sr-only">Filtrer par {filter.label}</legend>
          <FilterOptionRows filter={filter} selected={selected} onChange={onChange} />
        </fieldset>
      )}
    </div>
  );
}
