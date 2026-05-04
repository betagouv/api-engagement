import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
  labelId?: string;
};

export default function SingleSelectIcon({ onChange, options, selected, error, labelId }: Props) {
  return (
    <fieldset className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`} aria-labelledby={`single-select-icon-messages ${labelId}`}>
      <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 max-w-4xl! mx-0! gap-x-6 gap-y-4!">
        {options.map((o) => (
          <div key={o.taxonomyKey} className="fr-fieldset__element mb-0!">
            <div className="fr-radio-group fr-radio-rich mb-0!">
              <input
                value={o.taxonomyKey}
                type="radio"
                id={`single-select-icon-${o.taxonomyKey}`}
                name="single-select-icon"
                onChange={() => onChange(o.taxonomyKey)}
                checked={selected === o.taxonomyKey}
              />
              <label className="fr-label text-base" htmlFor={`single-select-icon-${o.taxonomyKey}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-radio-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="single-select-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error" id="single-select-message-error">
            {error}
          </p>
        </div>
      )}
    </fieldset>
  );
}
