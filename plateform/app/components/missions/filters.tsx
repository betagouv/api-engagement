import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Combobox from "~/components/ui/combobox";

export type FilterOption = { value: string; label: string; count?: number };

export type FilterDef = {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  single?: boolean;
};

interface MissionFiltersProps {
  filters: FilterDef[];
  onChange: (key: string, next: string[]) => void;
}

export default function MissionFiltersBar({ filters, onChange }: MissionFiltersProps) {
  return (
    <div className="fr-container px-0! bg-background hidden flex-col shadow-lg md:flex md:flex-row">
      {filters.map((filter, index) => (
        <div key={filter.key} className="min-w-0 flex-1">
          <Combobox
            label={filter.label}
            placeholder={filter.placeholder}
            options={filter.options}
            selected={filter.selected}
            single={filter.single}
            onChange={(next) => onChange(filter.key, next)}
            className={`py-5 ${index !== 0 ? "after:content-[''] after:absolute after:top-4 after:bottom-4 after:left-0 after:w-px after:bg-border-default-grey" : ""}`}
          />
        </div>
      ))}
    </div>
  );
}

export function MissionFiltersTrigger({ filters, onChange }: MissionFiltersProps) {
  const [open, setOpen] = useState(false);
  const totalSelected = filters.reduce((sum, filter) => sum + filter.selected.length, 0);

  return (
    <>
      <button type="button" className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-filter-line bg-background! md:hidden!" onClick={() => setOpen(true)}>
        Filtres{totalSelected > 0 ? ` (${totalSelected})` : ""}
      </button>
      {open && <MobileFiltersSheet filters={filters} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}

interface MobileFiltersSheetProps {
  filters: FilterDef[];
  onChange: (key: string, next: string[]) => void;
  onClose: () => void;
}

function MobileFiltersSheet({ filters, onChange, onClose }: MobileFiltersSheetProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    filters.forEach((filter) => {
      initial[filter.key] = true;
    });
    return initial;
  });

  useEffect(() => {
    setMounted(true);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (mounted) closeButtonRef.current?.focus();
  }, [mounted]);

  if (!mounted) return null;

  const [selectFilter, ...accordionFilters] = filters;

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return createPortal(
    <div
      className="fixed inset-0 z-[1750] flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative flex max-h-[90vh] w-full flex-col bg-background px-4 pt-4 pb-14">
        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-right fr-icon-close-line"
            aria-label="Fermer les filtres"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <h2 id={titleId} className="fr-h4">
          <i className="fr-icon-filter-fill fr-icon--lg mr-2" aria-hidden="true" />
          Filtres des missions
        </h2>

        <div className="flex-1 space-y-6 overflow-y-auto">
          {selectFilter && <FilterSelect filter={selectFilter} onChange={(next) => onChange(selectFilter.key, next)} />}

          {accordionFilters.map((filter) => (
            <FilterAccordion
              key={filter.key}
              filter={filter}
              open={openSections[filter.key] ?? false}
              onToggleOpen={() => toggleSection(filter.key)}
              onChange={(next) => onChange(filter.key, next)}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface FilterSelectProps {
  filter: FilterDef;
  onChange: (next: string[]) => void;
}

function FilterSelect({ filter, onChange }: FilterSelectProps) {
  const selectId = useId();
  const value = filter.selected[0] ?? "";

  return (
    <div>
      <label className="fr-text--lead font-bold text-title-grey leading-none! mb-0!" htmlFor={selectId}>
        {filter.label}
      </label>
      <select id={selectId} className="fr-select w-full mt-2!" value={value} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}>
        <option value="">{filter.placeholder}</option>
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterAccordionProps {
  filter: FilterDef;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (next: string[]) => void;
}

function FilterAccordion({ filter, open, onToggleOpen, onChange }: FilterAccordionProps) {
  const reactId = useId();
  const isSingle = filter.single === true;

  const toggleOption = (value: string) => {
    const isSelected = filter.selected.includes(value);
    if (isSingle) {
      onChange(isSelected ? [] : [value]);
      return;
    }
    onChange(isSelected ? filter.selected.filter((current) => current !== value) : [...filter.selected, value]);
  };

  return (
    <div>
      <button type="button" className="flex w-full items-center justify-between" aria-expanded={open} onClick={onToggleOpen}>
        <span className="fr-text--lead font-bold text-title-grey leading-none! mb-0!">{filter.label}</span>
        <i className={`fr-icon-arrow-down-s-line text-blue-france-sun transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {filter.options.map((option) => {
            const inputId = `${reactId}-${option.value}`;
            const isSelected = filter.selected.includes(option.value);
            return (
              <div key={option.value} className="flex items-center justify-between gap-3">
                <div className={isSingle ? "fr-radio-group" : "fr-checkbox-group"}>
                  <input
                    type={isSingle ? "radio" : "checkbox"}
                    id={inputId}
                    name={isSingle ? `${reactId}-group` : undefined}
                    checked={isSelected}
                    onChange={() => toggleOption(option.value)}
                  />
                  <label className="fr-label" htmlFor={inputId}>
                    {option.label}
                  </label>
                </div>
                {option.count !== undefined && <span className="shrink-0 text-xs text-title-grey">{option.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
