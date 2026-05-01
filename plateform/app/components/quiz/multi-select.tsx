import type { StepOption } from "~/types/quiz";

type Props = {
  options: StepOption[];
  selected: string[];
  onChange: (taxonomyKeys: string[]) => void;
};

// Composant générique : cases à cocher. Rapporte la nouvelle sélection via onChange
// à chaque toggle. Les valeurs sont des `taxonomyKey`.
export default function MultiSelect({ options, selected, onChange }: Props) {
  const toggle = (taxonomyKey: string) => {
    const next = selected.includes(taxonomyKey) ? selected.filter((v) => v !== taxonomyKey) : [...selected, taxonomyKey];
    onChange(next);
  };

  return (
    <div>
      {options.map((o) => (
        <div key={o.taxonomyKey} className="fr-checkbox-group fr-mb-2w">
          <input
            type="checkbox"
            id={o.taxonomyKey}
            name={o.taxonomyKey}
            checked={selected.includes(o.taxonomyKey)}
            onChange={() => toggle(o.taxonomyKey)}
          />
          <label className="fr-label" htmlFor={o.taxonomyKey}>
            {o.label}
            {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
          </label>
        </div>
      ))}
    </div>
  );
}
