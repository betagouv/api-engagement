import type { ReactNode } from "react";
import { DISABLED_OPTION_HINT } from "~/config/quiz-options";
import type { StepOption } from "~/types/quiz";

type Props = {
  title: ReactNode;
  subtitle?: string;
  onChange: (value: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
  required?: boolean;
};

export default function RadioGroup({ title, subtitle, onChange, options, selected, error, required }: Props) {
  return (
    // `block!` : contourne un bug de layout iOS Safari sur fr-fieldset (display:flex) — cf checkbox-group-rich.

    <fieldset className={`fr-fieldset block! ${error ? "fr-fieldset--error" : ""}`} id="storybook-form" aria-labelledby="storybook-form-legend storybook-form-messages">
      <legend className="mb-6! md:mb-8! fr-fieldset__legend--regular fr-fieldset__legend" id="storybook-form-legend">
        <h1 className={`fr-h1 mb-4! ${error ? "text-error!" : ""}`}>{title}</h1>
        {subtitle && (
          <span className="fr-text--lead block! mb-0!">
            {subtitle}
            {required && <span className={`fr-hint-text inline! mb-0! ${error ? "text-error!" : ""}`}> (Champ obligatoire)</span>}
          </span>
        )}
        {!subtitle && required && <span className={`fr-hint-text mb-0! ${error ? "text-error!" : ""}`}>(Champ obligatoire)</span>}
      </legend>
      {options.map((o) => (
        <div className="fr-fieldset__element md:max-w-sm! max-w-full!" key={o.value}>
          <div className="fr-radio-group fr-radio-rich">
            <input
              value={o.value}
              type="radio"
              id={`radio-group-${o.value}`}
              name="radio-group"
              onChange={() => onChange(o.value)}
              checked={!o.disabled && selected === o.value}
              disabled={o.disabled}
              aria-required={required ? "true" : undefined}
              aria-invalid={error ? true : undefined}
            />
            <label className={`fr-label ${o.disabled ? "cursor-not-allowed!" : ""}`} htmlFor={`radio-group-${o.value}`}>
              {o.label}
              {o.disabled ? <span className="fr-hint-text">{DISABLED_OPTION_HINT}</span> : o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
            </label>
          </div>
        </div>
      ))}

      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="radio-group-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error">{error}</p>
        </div>
      )}
    </fieldset>
  );
}
