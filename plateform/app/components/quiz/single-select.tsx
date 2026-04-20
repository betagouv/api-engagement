import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (optionId: string) => void;
  options: StepOption[];
};

// Composant générique : un choix → navigation immédiate vers le step suivant.
// Le titre/sous-titre sont rendus par la route appelante pour rester personnalisables.
export default function SingleSelect({ onChange, options }: Props) {
  return (
    <ul className="fr-btns-group fr-mt-4w">
      {options.map((o) => (
        <li key={o.id}>
          <button type="button" className="fr-btn fr-btn--secondary" onClick={() => onChange(o.id)}>
            {o.label}
            {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
