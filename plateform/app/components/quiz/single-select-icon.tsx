import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
  error?: string;
};

export default function SingleSelectIcon({ onChange, options, error }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <fieldset className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`}>
        <div className="fr-fieldset__content grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-w-4xl!">
          {options.map((o) => (
            <div key={o.taxonomyKey} className="fr-fieldset__element m-0! p-0!">
              <div className="fr-radio-group fr-radio-rich m-0!">
                <input value={o.taxonomyKey} type="radio" id={`single-select-icon-${o.taxonomyKey}`} name="single-select-icon" onChange={() => onChange(o.taxonomyKey)} />
                <label className="fr-label text-base" htmlFor={`single-select-icon-${o.taxonomyKey}`}>
                  {o.label}
                  {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
                </label>
                <div className="fr-radio-rich__pictogram">{o.icon && <div className="text-2xl">{o.icon}</div>}</div>
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      {error && <p className="fr-error-text mt-0!">{error}</p>}
    </div>
  );
}
