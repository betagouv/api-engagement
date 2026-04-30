import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
};

export default function SingleSelectIcon({ onChange, options }: Props) {
  return (
    <fieldset className="fr-fieldset">
      <div className="fr-fieldset__content tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-x-6 tw:gap-y-4 tw:max-w-4xl!">
        {options.map((o) => (
          <div className="fr-fieldset__element tw:m-0! tw:p-0!">
            <div className="fr-radio-group fr-radio-rich tw:m-0!">
              <input value={o.taxonomyKey} type="radio" id={`single-select-icon-${o.taxonomyKey}`} name="single-select-icon" onChange={() => onChange(o.taxonomyKey)} />
              <label className="fr-label tw:text-base" htmlFor={`single-select-icon-${o.taxonomyKey}`}>
                {o.label}
                {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
              </label>
              <div className="fr-radio-rich__pictogram">{o.icon && <div className="tw:text-2xl">{o.icon}</div>}</div>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
