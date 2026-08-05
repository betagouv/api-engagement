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
  required?: boolean;
  columns?: 1 | 2;
};

export default function CheckboxGroupRich({ title, subtitle, onChange, options, selected, error, required, columns = 2 }: Props) {
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
      aria-describedby={error ? "checkbox-group-rich-legend checkbox-group-rich-messages" : "checkbox-group-rich-legend"}
    >
      <legend className="mb-6! md:mb-8! fr-fieldset__legend--regular fr-fieldset__legend" id="checkbox-group-rich-legend">
        <h1 className={`fr-h1 mb-4! ${error ? "text-error!" : ""}`}>{title}</h1>
        {subtitle && (
          <span className="fr-text--lead block! mb-0!">
            {subtitle}
            {required && <span className={`inline! mb-0! ml-2! ${error ? "text-error!" : ""}`}>(champ obligatoire)</span>}
          </span>
        )}
        {!subtitle && required && <span className={`fr-text--lead mb-0! ${error ? "text-error!" : ""}`}>(champ obligatoire)</span>}
      </legend>
      <div className={`fr-fieldset__content grid grid-cols-1 w-full! ${columns === 1 ? "md:max-w-md!" : "md:grid-cols-2 max-w-5xl!"} mx-0! gap-x-6 gap-y-4!`}>
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
                aria-invalid={error ? true : undefined}
              />
              <label
                className={`fr-label text-base before:size-4! after:absolute after:inset-0 after:right-[-5.5rem] after:content-[''] ${o.disabled ? "cursor-not-allowed!" : ""}`}
                htmlFor={`checkbox-group-rich-${o.value}`}
              >
                {o.label}
                {o.disabled ? <span className="fr-hint-text">{DISABLED_OPTION_HINT}</span> : o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-checkbox-rich__pictogram" aria-hidden="true">
                {o.icon && <div className="text-2xl">{o.icon}</div>}
              </div>
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
