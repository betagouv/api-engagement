import { useEffect, useId, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string; count?: number };

interface ComboboxProps {
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export default function Combobox({ label, placeholder, options, selected, onChange }: ComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
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
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const visibleOptions = search ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())) : options;

  const toggleOption = (option: ComboboxOption) => {
    const isSelected = selected.includes(option.value);
    onChange(isSelected ? selected.filter((value) => value !== option.value) : [...selected, option.value]);
  };

  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const hasSelection = selectedOptions.length > 0;
  const summaryLabel = hasSelection ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}` : placeholder;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        className="w-full px-4 text-left transition-colors hover:bg-background-default-grey-hover"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="fr-text text-title-grey">{label}</span>

        <div className="relative flex items-center justify-between gap-2">
          <span className={`truncate fr-text ${hasSelection ? "font-bold text-title-grey" : "italic text-mention-grey"}`}>{summaryLabel}</span>
          <i className={`fr-icon-arrow-down-s-line fr-icon--sm shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-50 min-w-80 mt-1 border border-border-default-grey bg-white shadow-lg">
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

          <fieldset className="fr-fieldset mx-2! max-h-60 overflow-y-auto" tabIndex={-1}>
            <legend className="fr-fieldset__legend sr-only">Sélectionner {label.toLowerCase()}</legend>

            <div className="fr-fieldset__content">
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-title-grey">Aucune option disponible</p>
              ) : (
                visibleOptions.map((option) => {
                  const inputId = `${reactId}-${option.value}`;
                  const isSelected = selected.includes(option.value);
                  return (
                    <div key={option.value} className="flex items-center justify-between gap-3">
                      <div className="fr-checkbox-group fr-checkbox-group min-w-0 flex-1">
                        <input type="checkbox" id={inputId} checked={isSelected} onChange={() => toggleOption(option)} />
                        <label className="fr-label" htmlFor={inputId}>
                          {option.label}
                        </label>
                      </div>
                      {option.count !== undefined && <span className="shrink-0 text-xs text-title-grey">{option.count}</span>}
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
