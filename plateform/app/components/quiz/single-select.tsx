import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
};

export default function SingleSelect({ onChange, options, selected, error }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <fieldset className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`}>
        <div className="fr-fieldset__content flex flex-col gap-4">
          {options.map((o) => (
            <div key={o.taxonomyKey} className={`fr-radio-group bg-white border px-4 h-12 w-full max-w-80! ${error ? "border-border-plain-error" : "border-border-default-grey"}`}>
              <input
                className="ml-1"
                type="radio"
                id={`single-select-${o.taxonomyKey}`}
                name="single-select"
                value={o.taxonomyKey}
                onChange={() => onChange(o.taxonomyKey)}
                checked={selected === o.taxonomyKey}
              />
              <label className="fr-label" htmlFor={`single-select-${o.taxonomyKey}`}>
                {o.icon ? `${o.icon} ` : ""}
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      {error && <p className="fr-error-text mt-0!">{error}</p>}
    </div>
  );
}
