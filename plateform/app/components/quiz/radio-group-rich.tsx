import type { ReactNode } from "react";
import { DISABLED_OPTION_HINT } from "~/config/quiz-options";
import type { StepOption } from "~/types/quiz";

type Props = {
  title: ReactNode;
  subtitle?: string;
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
};

export default function RadioGroupRich({ title, subtitle, onChange, options, selected, error }: Props) {
  return (
    <fieldset
      className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`}
      id="radio-group-rich"
      role="group"
      aria-describedby={`radio-group-rich-legend ${error && "radio-group-rich-messages"}`}
    >
      <legend className="fr-h1 mb-10! ml-2!" id="radio-group-rich-legend">
        {title}
        {subtitle && <span className="fr-text--lead font-normal block mt-4! mb-0!">{subtitle}</span>}
      </legend>
      <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 max-w-4xl! mx-0! gap-x-6 gap-y-4!">
        {options.map((o) => (
          <div key={o.value} className={`fr-fieldset__element mb-0! ${o.disabled ? "opacity-60" : ""}`}>
            <div className="fr-radio-group fr-radio-rich mb-0!">
              <input
                value={o.value}
                type="radio"
                id={`radio-group-rich-${o.value}`}
                name="radio-group-rich"
                onChange={() => onChange(o.value)}
                checked={!o.disabled && selected === o.value}
                disabled={o.disabled}
              />
              <label className={`fr-label text-base ${o.disabled ? "cursor-not-allowed!" : ""}`} htmlFor={`radio-group-rich-${o.value}`}>
                {o.label}
                {o.disabled ? <span className="fr-hint-text">{DISABLED_OPTION_HINT}</span> : o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-radio-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="radio-group-rich-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error">{error}</p>
        </div>
      )}
    </fieldset>
  );
}
