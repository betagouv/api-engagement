import type { ReactNode } from "react";

type Props = {
  subtitle?: string;
  children: ReactNode;
  htmlFor: string;
  error?: string;
  required?: boolean;
  // h2 sur la page d'entrée du quiz, dont le h1 est l'intro « Trouve ta mission en 9 questions » (cf. quiz/_layout.tsx).
  as?: "h1" | "h2";
};

export default function Label({ subtitle, children, htmlFor, error, required, as: Heading = "h1" }: Props) {
  return (
    <label htmlFor={htmlFor} className="mb-8!">
      <Heading className={`fr-h1 ${error ? "text-error!" : ""}`}>
        {children}
        <span className="fr-text--lead block! mt-4! mb-0! font-normal!">
          {subtitle}
          {required && <span className="fr-text--sm inline! mb-0! ml-2!">(champ obligatoire)</span>}
        </span>
        {!subtitle && required && <span className="fr-text--sm block! mb-0! font-normal!">(champ obligatoire)</span>}
      </Heading>
    </label>
  );
}
