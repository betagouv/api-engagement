import type { ReactNode } from "react";
import type { StepOption } from "~/types/quiz";

type Props = {
  title: ReactNode;
  subtitle?: string;
  onChange: (value: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
};

export default function RadioGroup({ title, subtitle, onChange, options, selected, error }: Props) {
  return (
    <fieldset
      className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`}
      id="radio-group"
      role="group"
      aria-describedby={`radio-group-legend ${error && "radio-group-messages"}`}
    >
      <legend className="fr-h1 mb-10! ml-2!" id="radio-group-legend">
        {title}
        {subtitle && <span className="fr-text--lead font-normal block mt-4! mb-0!">{subtitle}</span>}
      </legend>
      <div className="fr-fieldset__content flex flex-col gap-4 max-w-sm! mx-0! ml-2!">
        {options.map((o) => (
          <div key={o.value} className={`fr-fieldset__element mb-0! border bg-white px-4! ${error ? "border-border-plain-error" : "border-border-default-grey"}`}>
            <div className="fr-radio-group fr-radio-group--sm mt-0! mb-0! w-full max-w-none!">
              <input value={o.value} type="radio" id={`radio-group-${o.value}`} name="radio-group" onChange={() => onChange(o.value)} checked={selected === o.value} />
              <label className="fr-label text-sm w-full" htmlFor={`radio-group-${o.value}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="fr-messages-group mt-4! mb-0!" id="radio-group-messages" aria-live="polite">
          <p className="fr-message-sm fr-message--error">{error}</p>
        </div>
      )}
    </fieldset>
  );
}
