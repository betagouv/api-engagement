import type { ReactNode } from "react";

type Props = {
  subtitle?: string;
  children: ReactNode;
  htmlFor: string;
};

export default function Label({ subtitle, children, htmlFor }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="fr-h1 mb-0!">
        <label htmlFor={htmlFor}>{children}</label>
      </h1>
      {subtitle && <p className="fr-text--lead mb-0!">{subtitle}</p>}
    </div>
  );
}
