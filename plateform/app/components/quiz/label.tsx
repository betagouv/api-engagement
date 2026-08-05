import type { ReactNode } from "react";

type Props = {
  subtitle?: string;
  children: ReactNode;
  htmlFor: string;
  error?: string;
  required?: boolean;
};

export default function Label({ subtitle, children, htmlFor, error, required }: Props) {
  return (
    <label htmlFor={htmlFor} className="mb-8!">
      <h1 className={`fr-h1 ${error ? "text-error!" : ""}`}>
        {children}
        <span className="fr-text--lead block! mt-4! mb-0! font-normal!">
          {subtitle}
          {required && <span className="inline! mb-0! ml-2!">(champ obligatoire)</span>}
        </span>
        {!subtitle && required && <span className="fr-text--lead mb-0!">(champ obligatoire)</span>}
      </h1>
    </label>
  );
}
