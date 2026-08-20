import { useEffect, useId, useRef, useState } from "react";
import type { StepId } from "~/config/quiz-flow";
import { OPTIONS, type QuizOptionKey } from "~/config/quiz-options";
import { invalidateInitialMatches } from "~/services/matching";
import { updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";
import { buildPayload } from "~/utils/quiz";

// Un filtre = une question du quiz (steps q2, nommés comme leur taxonomy). Le tag affiche la
// réponse courante (bleu plein) ou un libellé générique si la question est sans réponse (bleu clair).
// Les listes d'options reprennent celles des steps correspondants (app/routes/quiz/*.tsx), sans les
// options neutres (« Je ne sais pas », « Peu importe ») qui n'ont pas de sens comme filtre.
type ResultsFilterDef = {
  stepId: StepId;
  // Libellé de la question pour les intitulés accessibles (bouton du tag, bouton Effacer).
  label: string;
  // Libellé du tag quand la question n'a pas de réponse, repris comme titre du panneau.
  placeholder: string;
  optionKeys: QuizOptionKey[];
  single?: boolean;
};

const FILTERS: ResultsFilterDef[] = [
  {
    stepId: "rythme",
    label: "le rythme",
    placeholder: "Ton rythme",
    optionKeys: [
      "rythme.ponctuelle_journee",
      "rythme.quelques_heures_semaine",
      "rythme.plusieurs_jours_semaine",
      "rythme.quelques_jours_annee",
      "rythme.temps_plein_plusieurs_mois",
    ],
  },
  {
    stepId: "domaine_engagement",
    label: "les domaines",
    placeholder: "Tes domaines",
    optionKeys: [
      "domaine_engagement.sante_bien_etre",
      "domaine_engagement.sport",
      "domaine_engagement.solidarite_inclusion",
      "domaine_engagement.environnement_animaux",
      "domaine_engagement.art_culture",
      "domaine_engagement.securite_secours",
      "domaine_engagement.citoyennete",
      "domaine_engagement.numerique",
      "domaine_engagement.education",
    ],
  },
  {
    stepId: "mobilite",
    label: "la mobilité",
    placeholder: "Ta mobilité",
    optionKeys: ["mobilite.pied_transports", "mobilite.velo", "mobilite.voiture"],
  },
  {
    stepId: "activite",
    label: "les activités",
    placeholder: "Tes activités",
    optionKeys: [
      "activite.aider_accompagner",
      "activite.transmettre_animer",
      "activite.fabriquer_reparer_terrain",
      "activite.secourir_proteger",
      "activite.organiser_coordonner",
      "activite.creer_communiquer",
    ],
  },
  {
    stepId: "equipe",
    label: "l’équipe",
    placeholder: "Ton équipe",
    single: true,
    optionKeys: ["equipe.autonomie", "equipe.petit_groupe", "equipe.grand_collectif"],
  },
  {
    stepId: "interaction",
    label: "la participation",
    placeholder: "Ta participation",
    single: true,
    optionKeys: ["interaction.interaction_collective", "interaction.equilibre_collectif_autonomie", "interaction.autonomie_principale"],
  },
  {
    stepId: "autonomie",
    label: "l’accompagnement",
    placeholder: "Ton accompagnement",
    single: true,
    optionKeys: ["autonomie.organisation_libre", "autonomie.accompagnement_initial", "autonomie.cadre_suivi_regulier"],
  },
  {
    stepId: "imprevu",
    label: "les imprévus",
    placeholder: "Tes imprévus",
    single: true,
    optionKeys: ["imprevu.adaptation_rapide", "imprevu.imprevu_modere", "imprevu.cadre_previsible"],
  },
];

interface ResultsFiltersProps {
  userScoringId: string | undefined;
  // Appelé après la mise à jour du scoring : la page recharge les résultats (retour page 1).
  onResultsChange: () => void;
}

export default function ResultsFilters({ userScoringId, onResultsChange }: ResultsFiltersProps) {
  const answers = useQuizStore((s) => s.answers);
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Les sélections ne modifient que le store (les tags se mettent à jour) : rien n'est
  // envoyé tant que l'utilisateur ne clique pas sur « Voir les résultats ».
  const handleChange = (filter: ResultsFilterDef, optionIds: string[]) => {
    setAnswer(filter.stepId, { type: "options", taxonomy: filter.stepId, option_ids: optionIds });
  };

  const handleApply = async () => {
    if (!userScoringId || loading) return;
    const { answers: freshAnswers, distinctId } = useQuizStore.getState();
    const payload = buildPayload(freshAnswers);
    // Comme dans le layout du quiz : pas de PUT quand il n'y a plus aucune réponse exploitable.
    if (payload.answers.length === 0) return;

    setLoading(true);
    try {
      await updateUserScoring(userScoringId, { ...payload, distinctId });
      invalidateInitialMatches(userScoringId);
      setSaveError(false);
      onResultsChange();
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
            const selected = answer?.type === "options" ? answer.option_ids : [];
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

interface FilterTagProps {
  filter: ResultsFilterDef;
  selected: string[];
  onChange: (next: string[]) => void;
}

function FilterTag({ filter, selected, onChange }: FilterTagProps) {
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

  const toggleOption = (value: string) => {
    if (filter.single) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((current) => current !== value) : [...selected, value]);
  };

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
            {options.map((option) => {
              const inputId = `${reactId}-${option.value}`;
              const isSelected = selected.includes(option.value);
              return (
                <div key={option.value} className={`${filter.single ? "fr-radio-group" : "fr-checkbox-group"} py-1`}>
                  {/* Radio : la sélection passe par `change` (émis aussi au clavier) ; `click` ne sert qu'à
                      désélectionner un radio déjà coché, seul cas où `change` ne peut pas se produire. */}
                  <input
                    type={filter.single ? "radio" : "checkbox"}
                    id={inputId}
                    name={filter.single ? `${reactId}-group` : undefined}
                    checked={isSelected}
                    onChange={() => toggleOption(option.value)}
                    onClick={filter.single && isSelected ? () => onChange([]) : undefined}
                  />
                  <label className="fr-label" htmlFor={inputId}>
                    {option.label}
                  </label>
                </div>
              );
            })}
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
