import React from "react";

type Props = {
  subtitle?: string;
  children: React.ReactNode;
  htmlFor?: string;
  id?: string;
};

export default function Label({ subtitle, children, htmlFor, id }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <label className="fr-h1 mb-0!" htmlFor={htmlFor} id={id}>
        {children}
      </label>
      {subtitle && <p className="fr-text--lead">{subtitle}</p>}
    </div>
  );
}
