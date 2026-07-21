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

export const sanitizeDescriptionHtml = (html: string): string => sanitizeHtml(html, SANITIZE_OPTIONS);
