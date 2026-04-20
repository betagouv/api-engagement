import type { StepOption } from "~/types/quiz";

type Props = {
  options: StepOption[];
  selected: string[];
  onChange: (optionIds: string[]) => void;
};

// Composant générique : cases à cocher. Rapporte la nouvelle sélection via onChange
// à chaque toggle. Le titre, le bouton "Continuer" et la validation min/max sont
// rendus par la route appelante.
export default function MultiSelect({ options, selected, onChange }: Props) {
  const toggle = (optionId: string) => {
    const next = selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
    onChange(next);
  };

  return (
    <div>
      {options.map((o) => (
        <div key={o.id} className="fr-checkbox-group fr-mb-2w">
          <input type="checkbox" id={o.id} name={o.id} checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
          <label className="fr-label" htmlFor={o.id}>
            {o.label}
            {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
          </label>
        </div>
      ))}
    </div>
  );
}
