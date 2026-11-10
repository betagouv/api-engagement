import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

import Highlight from "~/components/ui/highlight";

// Mini-markup des textes éditoriaux (CMS) : `==surlignage==`, `[libellé](/chemin)` et saut de ligne.
// Pas de HTML : le contenu reste du texte, rendu par React (aucun risque d'injection).
const TOKEN = /==(.+?)==|\[(.+?)\]\((.+?)\)/g;

export default function InlineText({
  text,
  highlightClassName,
  linkClassName = "fr-link",
  breakClassName,
}: {
  text: string;
  highlightClassName?: string;
  linkClassName?: string;
  // Sans cette classe, le saut de ligne est toujours affiché.
  breakClassName?: string;
}) {
  return text.split("\n").map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {/* L'espace avant le saut garde les mots séparés quand le saut est masqué (`breakClassName`). */}
      {lineIndex > 0 && (
        <>
          {" "}
          <br className={breakClassName} />
        </>
      )}
      {renderLine(line, { highlightClassName, linkClassName })}
    </Fragment>
  ));
}

function renderLine(line: string, { highlightClassName, linkClassName }: { highlightClassName?: string; linkClassName: string }): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(TOKEN)) {
    if (match.index > cursor) nodes.push(line.slice(cursor, match.index));
    const [, highlighted, label, to] = match;
    nodes.push(
      highlighted ? (
        <Highlight key={match.index} className={highlightClassName}>
          {highlighted}
        </Highlight>
      ) : (
        <Link key={match.index} to={to} className={linkClassName}>
          {label}
        </Link>
      ),
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) nodes.push(line.slice(cursor));

  return nodes;
}
