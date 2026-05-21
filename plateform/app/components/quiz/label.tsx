import type { ReactNode } from "react";

type Props = {
  subtitle?: string;
  children: ReactNode;
  htmlFor: string;
};

export default function Label({ subtitle, children, htmlFor }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <label className="fr-h1 mb-0!" htmlFor={htmlFor}>
        {children}
      </label>
      {subtitle && <p className="fr-text--lead mb-0!">{subtitle}</p>}
    </div>
  );
}
