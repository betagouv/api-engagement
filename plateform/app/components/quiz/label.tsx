import type { ReactNode } from "react";

type Props = {
  subtitle?: string;
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
};

export default function Label({ subtitle, children, htmlFor, required }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="fr-h1 mb-0!">
        <label htmlFor={htmlFor}>{children}</label>
      </h1>
      {subtitle && (
        <p className="fr-text--lead mb-0!">
          {subtitle}
          {required && <span className="fr-hint-text inline! mb-0!"> (Champ obligatoire)</span>}
        </p>
      )}
      {!subtitle && required && <p className="fr-hint-text mb-0!">Champ obligatoire</p>}
    </div>
  );
}
