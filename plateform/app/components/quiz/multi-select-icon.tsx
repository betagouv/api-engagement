import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKeys: string[]) => void;
  options: StepOption[];
  selected: string[];
  error?: string;
};

export default function MultiSelectIcon({ onChange, options, selected, error }: Props) {
  const toggle = (taxonomyKey: string) => {
    const next = selected.includes(taxonomyKey) ? selected.filter((v) => v !== taxonomyKey) : [...selected, taxonomyKey];
    onChange(next);
  };

  return (
    <fieldset className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`}>
      <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 max-w-4xl! mx-0! gap-x-6 gap-y-4!">
        {options.map((o) => (
          <div key={o.value} className="fr-fieldset__element mb-0!">
            <div className="fr-checkbox-group fr-checkbox-rich mt-0! mb-0!">
              <input
                value={o.value}
                type="checkbox"
                id={`multi-select-icon-${o.value}`}
                name="multi-select-icon"
                onChange={() => toggle(o.value)}
                checked={selected.includes(o.value)}
              />
              <label className="fr-label text-base before:size-4! after:absolute after:inset-0 after:right-[-5.5rem] after:content-['']" htmlFor={`multi-select-icon-${o.value}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-checkbox-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="multi-select-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error" id="multi-select-message-error">
            {error}
          </p>
        </div>
      )}
    </fieldset>
  );
}
