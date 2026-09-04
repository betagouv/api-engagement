import { useId } from "react";
import { OPTIONS } from "~/config/quiz-options";
import type { ResultsFilterDef } from "~/config/results-filters";

export interface FilterOptionsProps {
  filter: ResultsFilterDef;
  selected: string[];
  onChange: (next: string[]) => void;
}

// Lignes checkbox/radio d'un filtre, partagées entre le panneau desktop et l'accordéon de la modale mobile.
export default function FilterOptionRows({ filter, selected, onChange }: FilterOptionsProps) {
  const reactId = useId();

  const toggleOption = (value: string) => {
    if (filter.single) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((current) => current !== value) : [...selected, value]);
  };

  return (
    <>
      {filter.optionKeys.map((key) => {
        const option = OPTIONS[key];
        const isSelected = selected.includes(option.value);
        const inputId = `${reactId}-${option.value}`;
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
    </>
  );
}
