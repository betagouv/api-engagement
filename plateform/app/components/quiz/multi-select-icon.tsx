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
      <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-4xl!">
        {options.map((o) => (
          <div key={o.taxonomyKey} className="fr-fieldset__element m-0! p-0!">
            <div className="fr-checkbox-group fr-checkbox-rich m-0!">
              <input
                value={o.taxonomyKey}
                type="checkbox"
                id={`multi-select-icon-${o.taxonomyKey}`}
                name="multi-select-icon"
                checked={selected.includes(o.taxonomyKey)}
                onChange={() => toggle(o.taxonomyKey)}
              />
              <label className="fr-label text-base" htmlFor={`multi-select-icon-${o.taxonomyKey}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-checkbox-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
