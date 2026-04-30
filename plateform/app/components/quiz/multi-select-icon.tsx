import type { StepOption } from "~/types/quiz";

type Props = {
  options: StepOption[];
  selected: string[];
  onChange: (taxonomyKeys: string[]) => void;
};

export default function MultiSelectIcon({ options, selected, onChange }: Props) {
  const toggle = (taxonomyKey: string) => {
    const next = selected.includes(taxonomyKey) ? selected.filter((v) => v !== taxonomyKey) : [...selected, taxonomyKey];
    onChange(next);
  };

  return (
    <fieldset className="fr-fieldset">
      <div className="fr-fieldset__content tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-x-6 tw:gap-y-4 tw:max-w-4xl!">
        {options.map((o) => (
          <div key={o.taxonomyKey} className="fr-fieldset__element tw:m-0! tw:p-0!">
            <div className="fr-checkbox-group fr-checkbox-rich tw:m-0!">
              <input
                value={o.taxonomyKey}
                type="checkbox"
                id={`multi-select-icon-${o.taxonomyKey}`}
                name="multi-select-icon"
                checked={selected.includes(o.taxonomyKey)}
                onChange={() => toggle(o.taxonomyKey)}
              />
              <label className="fr-label tw:text-base" htmlFor={`multi-select-icon-${o.taxonomyKey}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-checkbox-rich__pictogram">{o.icon && <div className="tw:text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
