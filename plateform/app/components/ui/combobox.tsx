import { useEffect, useId, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string; count?: number };

interface ComboboxProps {
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
  single?: boolean;
}

export default function Combobox({ label, placeholder, options, selected, onChange, className, single }: ComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reactId = useId();
  const panelId = `${reactId}-panel`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
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

  // En sélection unique, la valeur sélectionnée est remontée en première position (tri stable).
  const orderedOptions = single ? [...options].sort((a, b) => (selected.includes(b.value) ? 1 : 0) - (selected.includes(a.value) ? 1 : 0)) : options;
  const visibleOptions = search ? orderedOptions.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())) : orderedOptions;

  const toggleOption = (option: ComboboxOption) => {
    const isSelected = selected.includes(option.value);
    if (single) {
      onChange(isSelected ? [] : [option.value]);
      setOpen(false);
      return;
    }
    onChange(isSelected ? selected.filter((value) => value !== option.value) : [...selected, option.value]);
  };

  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const hasSelection = selectedOptions.length > 0;
  const summaryLabel = hasSelection ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}` : placeholder;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`w-full px-4 text-left transition-colors hover:bg-background-default-grey-hover ${className}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="fr-text text-title-grey">{label}</span>

        <div className="relative flex items-center justify-between gap-2">
          <span className={`truncate fr-text ${hasSelection ? "font-bold text-title-grey" : "italic text-mention-grey"}`}>{summaryLabel}</span>
          <i className={`fr-icon-arrow-down-s-line fr-icon--sm shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </div>
      </button>

      {open && (
        <div id={panelId} className="absolute right-0 left-0 z-50 min-w-80 mt-1 border border-border-default-grey bg-white! shadow-lg">
          <div className="relative m-4">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Rechercher ${label.toLowerCase()}`}
              className="fr-input w-full pr-10"
              aria-label={`Rechercher dans ${label.toLowerCase()}`}
            />
            <i className="fr-icon-search-line fr-icon--sm pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true" />
          </div>

          <fieldset className="max-h-60 w-full min-w-0 overflow-y-auto" tabIndex={-1}>
            <legend className="sr-only">Sélectionner {label.toLowerCase()}</legend>

            <div className="px-4">
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-title-grey">Aucune option disponible</p>
              ) : (
                visibleOptions.map((option) => {
                  const inputId = `${reactId}-${option.value}`;
                  const isSelected = selected.includes(option.value);
                  if (single) {
                    // Radio DSFR : on garde le `fr-label` nu (comme le FilterAccordion mobile) pour ne pas
                    // casser le positionnement par défaut du contrôle ; l'espacement et l'alignement du
                    // compteur se gèrent sur le wrapper.
                    return (
                      <div key={option.value} className="flex w-full items-center justify-between gap-3 py-2">
                        <div className="fr-radio-group min-w-0 flex-1">
                          <input type="radio" id={inputId} name={`${reactId}-group`} checked={isSelected} onChange={() => toggleOption(option)} />
                          <label className="fr-label" htmlFor={inputId}>
                            {option.label}
                          </label>
                        </div>
                        {option.count !== undefined && <span className="shrink-0 text-xs text-title-grey">{option.count}</span>}
                      </div>
                    );
                  }
                  return (
                    <div key={option.value} className="fr-checkbox-group flex w-full">
                      <input type="checkbox" id={inputId} checked={isSelected} onChange={() => toggleOption(option)} className="mr-2!" />
                      <label className="fr-label flex min-w-0 flex-1 flex-nowrap items-center justify-between gap-3 px-2! py-2! before:top-2!" htmlFor={inputId}>
                        <span className="min-w-0 truncate flex-1">{option.label}</span>
                        {option.count !== undefined && <span className="shrink-0 text-xs text-title-grey">{option.count}</span>}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </fieldset>

          {hasSelection && (
            <div className="flex justify-end border-t border-border-default-grey p-4">
              <button type="button" className="fr-btn fr-btn--sm fr-btn--tertiary" onClick={() => onChange([])}>
                Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
