import React from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function Highlight({ className = "bg-blue-france-950", children }: Props) {
  return (
    <span className="relative inline-block">
      <span aria-hidden className={`absolute inset-x-0 top-[55%] bottom-[5%] rounded-md ${className}`} />
      <span className="relative">{children}</span>
    </span>
  );
}

// Surligne `part` dans `text` (titres du quiz). Contrairement à <Highlight>, le surlignage suit le texte
// quand un groupe de mots passe à la ligne (box-decoration-clone) au lieu de déborder sur mobile.
export const highlightText = (text: string, part?: string) => {
  const index = part ? text.indexOf(part) : -1;
  if (!part || index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="box-decoration-clone rounded-md bg-[linear-gradient(to_top,transparent_20%,#fbe769_20%,#fbe769_55%,transparent_55%)] dark:bg-none">{part}</span>
      {text.slice(index + part.length)}
    </>
  );
};
