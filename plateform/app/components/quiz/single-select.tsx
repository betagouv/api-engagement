import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
};

export default function SingleSelect({ onChange, options }: Props) {
  return (
    <fieldset className="fr-fieldset">
      <div className="fr-fieldset__content tw:flex tw:flex-col tw:gap-4">
        {options.map((o) => (
          <div key={o.taxonomyKey} className="fr-radio-group tw:bg-white tw:border tw:border-border-default-grey tw:px-4 tw:h-12 tw:w-full tw:max-w-80!">
            <input className="tw:ml-1" type="radio" id={`single-select-${o.taxonomyKey}`} name="single-select" value={o.taxonomyKey} onChange={() => onChange(o.taxonomyKey)} />
            <label className="fr-label" htmlFor={`single-select-${o.taxonomyKey}`}>
              {o.icon ? `${o.icon} ` : ""}
              {o.label}
              {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
