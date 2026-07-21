import sanitizeHtml from "sanitize-html";

// RGAA 8.2 : le HTML des partenaires arrive sans garantie de validité. On ne conserve que les
// balises observées dans les flux réels (JVA, Service Civique, SPV) : titres, blocs et mise en
// forme sémantique — pas d'id, pas d'attributs de présentation, et les liens perdent target pour
// ne pas ouvrir de fenêtre non signalée (RGAA 13.2). span n'est pas autorisé : la balise est
// supprimée mais son texte est conservé.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "ul", "ol", "li", "blockquote", "strong", "em", "b", "i", "u", "s", "sup", "a"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
};

// RGAA 9.1 : la description est restituée sous le h2 « Présentation de la mission ». Les niveaux
// de titre réellement utilisés par le partenaire sont re-nivelés dans l'ordre vers h3 → h6, ce qui
// conserve leur hiérarchie relative sans introduire de saut de niveau ; au-delà de 4 niveaux
// distincts, les titres les plus profonds deviennent des paragraphes.
export const sanitizeDescriptionHtml = (html: string): string => {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  const headingLevels = [...new Set([...clean.matchAll(/<h([1-6])/g)].map((match) => Number(match[1])))].sort((a, b) => a - b);
  if (headingLevels.length === 0) return clean;

  const transformTags: Record<string, string> = {};
  headingLevels.forEach((level, index) => {
    transformTags[`h${level}`] = index < 4 ? `h${index + 3}` : "p";
  });
  return sanitizeHtml(clean, { ...SANITIZE_OPTIONS, transformTags });
};
