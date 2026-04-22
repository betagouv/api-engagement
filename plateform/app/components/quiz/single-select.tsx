import type { StepOption } from "~/types/quiz";

type Props = {
  onChange: (taxonomyKey: string) => void;
  options: StepOption[];
};

// Composant générique : un choix → navigation immédiate vers le step suivant.
export default function SingleSelect({ onChange, options }: Props) {
  return (
    <ul className="fr-btns-group fr-mt-4w tw:gap-4">
      {options.map((o) => (
        <li key={o.taxonomyKey}>
          <button
            type="button"
            className="tw:h-16 tw:px-4 tw:w-full tw:flex tw:items-center tw:justify-between tw:bg-info-950! tw:text-blue-france-sun! tw:font-bold"
            onClick={() => onChange(o.taxonomyKey)}
          >
            {o.label}
            {o.sublabel && <span className="fr-hint-text">{o.sublabel}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
