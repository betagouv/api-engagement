import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import FilterOptionRows, { type FilterOptionsProps } from "~/components/results/filter-option-rows";
import type { StepId } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { FILTERS, type ResultsFilterDef } from "~/config/results-filters";
import { createQuizScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";

export default function ResultsFilters() {
  const navigate = useNavigate();
  const answers = useQuizStore((s) => s.answers);
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Brouillon local des filtres modifiés (même principe que la modale mobile) : le store n'est mis à
  // jour qu'au clic sur « Voir les résultats », sinon les tags des cartes déjà affichées changeraient
  // alors que les résultats, eux, ne sont pas encore rechargés.
  const [draft, setDraft] = useState<Partial<Record<StepId, string[]>>>({});

  const handleChange = (filter: ResultsFilterDef, optionIds: string[]) => {
    setDraft((prev) => ({ ...prev, [filter.stepId]: optionIds }));
  };

  // Les critères choisis donnent un nouveau scoring : on bascule sur ses résultats (nouvelle URL).
  const handleApply = async () => {
    if (loading) return;
    for (const filter of FILTERS) {
      const optionIds = draft[filter.stepId];
      if (!optionIds) continue;
      setAnswer(filter.stepId, { type: "options", taxonomy: filter.stepId, option_ids: optionIds });
    }
    setLoading(true);
    try {
      const newUserScoringId = await createQuizScoring();
      setSaveError(false);
      if (newUserScoringId) navigate(`/results/${newUserScoringId}`);
    } catch {
      setSaveError(true);
    } finally {
      setLoading(false);
    }
  };

  // z-[600] : les panneaux dépliés doivent passer au-dessus de la carte mission affichée sur la map (z-[500]).
  return (
    <div className="relative z-[600] border-b border-border-default-grey bg-background">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          {FILTERS.map((filter) => {
            const answer = answers[filter.stepId];
            const selected = draft[filter.stepId] ?? (answer?.type === "options" ? answer.option_ids : []);
            return <FilterTag key={filter.stepId} filter={filter} selected={selected} onChange={(next) => handleChange(filter, next)} />;
          })}
          {saveError && (
            <p role="alert" className="fr-error-text m-0!">
              Impossible de mettre à jour tes filtres. Réessaie plus tard.
            </p>
          )}
        </div>
        <button type="button" className="fr-btn fr-btn--sm fr-btn--secondary shrink-0" disabled={loading} onClick={handleApply}>
          Voir les résultats
        </button>
      </div>
    </div>
  );
}

function FilterTag({ filter, selected, onChange }: FilterOptionsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reactId = useId();
  const panelId = `${reactId}-panel`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const options = filter.optionKeys.map((key) => OPTIONS[key]);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const hasSelection = selectedOptions.length > 0;
  const tagLabel = hasSelection ? selectedOptions[0].label : filter.placeholder;

  return (
    <div
      className="relative"
      ref={wrapperRef}
      onBlur={(event) => {
        // Ferme le panneau quand le focus sort du composant (Tab), comme un select natif.
        if (open && event.relatedTarget instanceof Node && !wrapperRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm leading-6 transition-colors ${
          hasSelection
            ? "bg-action-high-blue-france! text-inverted-blue-france! hover:bg-action-high-blue-france-hover!"
            : "bg-action-low-blue-france! text-action-high-blue-france! hover:bg-action-low-blue-france-hover!"
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">Filtrer par {filter.label} : </span>
        <span className="max-w-48 truncate">{tagLabel}</span>
        {selectedOptions.length > 1 && <span className="text-body-grey">+{selectedOptions.length - 1}</span>}
        <i className={`fr-icon-arrow-down-s-line fr-icon--sm shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="absolute top-full left-0 z-50 mt-2 w-80 border border-border-default-grey bg-background! shadow-lg">
          <p className="m-0! px-4 pt-4 font-bold text-title-grey">{filter.placeholder}</p>
          <fieldset
            className="max-h-80 w-full overflow-y-auto px-4 py-3"
            tabIndex={-1}
            onKeyDown={(event) => {
              // Entrée valide la sélection en cours et ferme le panneau.
              if (event.key === "Enter") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <legend className="sr-only">Filtrer par {filter.label}</legend>
            <FilterOptionRows filter={filter} selected={selected} onChange={onChange} />
          </fieldset>

          <div className="flex justify-end border-t border-border-default-grey p-3">
            <button type="button" className="fr-btn fr-btn--sm fr-btn--tertiary" aria-label={`Effacer le filtre sur ${filter.label}`} onClick={() => onChange([])}>
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
