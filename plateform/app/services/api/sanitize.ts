import sanitizeHtml from "sanitize-html";

// RGAA 8.2 : le HTML des partenaires arrive sans garantie de validité. On ne conserve que des
// balises de contenu — pas de titres ni d'id (structure de page, RGAA 9.1), pas d'attributs de
// présentation, et les liens perdent target pour ne pas ouvrir de fenêtre non signalée (RGAA 13.2).
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "em", "b", "i", "u", "a"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
};

export const sanitizeDescriptionHtml = (html: string): string => sanitizeHtml(html, SANITIZE_OPTIONS);
