import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (value: string) => void;
  options: StepOption[];
  selected?: string;
  error?: string;
  labelId?: string;
  id?: string;
};

export default function SingleSelect({ onChange, options, selected, error, labelId }: Props) {
  return (
    <>
      <fieldset id="single-select" role="group" className={`fr-fieldset ${error ? "fr-fieldset--error" : ""}`} aria-labelledby={`single-select-messages ${labelId}`}>
        {options.map((o) => (
          <div className="fr-fieldset__element">
            <div
              key={o.value}
              className={`fr-radio-group flex items-center bg-white border px-4 h-12 w-full max-w-80! ${error ? "border-border-plain-error" : "border-border-default-grey"}`}
            >
              <input
                className="ml-1"
                type="radio"
                id={`single-select-${o.value}`}
                name="single-select"
                value={o.value}
                onChange={() => onChange(o.value)}
                checked={selected === o.value}
              />
              <label className="fr-label" htmlFor={`single-select-${o.value}`}>
                {o.label}
              </label>
            </div>
          </div>
        ))}
      </fieldset>
    </>
  );
}
