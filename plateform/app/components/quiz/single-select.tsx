import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
};

// Composant générique : un choix → navigation immédiate vers le step suivant.
export default function SingleSelect({ onChange, options }: Props) {
  return (
    <ul className="fr-btns-group fr-mt-4w">
      {options.map((o) => (
        <li key={o.taxonomyKey}>
          <button type="button" className="fr-btn fr-btn--secondary" onClick={() => onChange(o.taxonomyKey)}>
            {o.label}
            {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
