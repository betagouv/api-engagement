import Combobox from "~/components/ui/combobox";

export type FilterOption = { value: string; label: string; count?: number };

export type FilterDef = {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
};

interface MissionFiltersBarProps {
  filters: FilterDef[];
  onChange: (key: string, next: string[]) => void;
}

export default function MissionFiltersBar({ filters, onChange }: MissionFiltersBarProps) {
  return (
    <div className="fr-container bg-background flex flex-col py-4 divide-y divide-border-default-grey shadow-lg md:flex-row md:divide-x md:divide-y-0">
      {filters.map((filter) => (
        <div key={filter.key} className="min-w-0 flex-1">
          <Combobox label={filter.label} placeholder={filter.placeholder} options={filter.options} selected={filter.selected} onChange={(next) => onChange(filter.key, next)} />
        </div>
      ))}
    </div>
  );
}
