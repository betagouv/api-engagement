import type { ReactNode } from "react";
import { DISABLED_OPTION_HINT } from "~/config/quiz-options";
import type { StepOption } from "~/types/quiz";

type Props = {
  title: ReactNode;
  subtitle?: string;
  onChange: (taxonomyKeys: string[]) => void;
  options: StepOption[];
  selected: string[];
  error?: string;
};

export default function CheckboxGroupRich({ title, subtitle, onChange, options, selected, error }: Props) {
  const toggle = (taxonomyKey: string) => {
    const next = selected.includes(taxonomyKey) ? selected.filter((v) => v !== taxonomyKey) : [...selected, taxonomyKey];
    onChange(next);
  };

  return (
    // `block!` : DSFR met fr-fieldset en display:flex, ce qui provoque un bug de layout iOS Safari
    // (espace fantôme sous le titre après une navigation SPA, corrigé seulement au reload). block l'évite.
    <fieldset
      className={`fr-fieldset block! ${error ? "fr-fieldset--error" : ""}`}
      id="checkbox-group-rich"
      role="group"
      aria-describedby={`checkbox-group-rich-legend ${error && "checkbox-group-rich-messages"}`}
    >
      <legend className="fr-h1 mb-10! ml-2!" id="checkbox-group-rich-legend">
        {title}
        {subtitle && <span className="fr-text--lead font-normal block mt-4! mb-0!">{subtitle}</span>}
      </legend>
      <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 max-w-4xl! mx-0! gap-x-6 gap-y-4!">
        {options.map((o) => (
          <div key={o.value} className={`fr-fieldset__element mb-0! ${o.disabled ? "opacity-60" : ""}`}>
            <div className="fr-checkbox-group fr-checkbox-rich mt-0! mb-0!">
              <input
                value={o.value}
                type="checkbox"
                id={`checkbox-group-rich-${o.value}`}
                name="checkbox-group-rich"
                onChange={() => toggle(o.value)}
                checked={!o.disabled && selected.includes(o.value)}
                disabled={o.disabled}
              />
              <label
                className={`fr-label text-base before:size-4! after:absolute after:inset-0 after:right-[-5.5rem] after:content-[''] ${o.disabled ? "cursor-not-allowed!" : ""}`}
                htmlFor={`checkbox-group-rich-${o.value}`}
              >
                {o.label}
                {o.disabled ? <span className="fr-hint-text">{DISABLED_OPTION_HINT}</span> : o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-checkbox-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="checkbox-group-rich-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error">{error}</p>
        </div>
      )}
    </fieldset>
  );
}
