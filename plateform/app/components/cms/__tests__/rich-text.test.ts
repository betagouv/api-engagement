import type { PageRichTextNode } from "~/types/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import RichText from "../rich-text";

const text = (value: string, modifiers: object = {}) => ({ type: "text" as const, text: value, ...modifiers });
const render = (nodes: PageRichTextNode[]) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RichText, { nodes })));

describe("RichText", () => {
  it("décale les titres d'un niveau (le h1 est le titre de la page) jusqu'au h6", () => {
    const html = render([
      { type: "heading", level: 1, children: [text("A")] },
      { type: "heading", level: 3, children: [text("B")] },
      { type: "heading", level: 6, children: [text("C")] },
    ]);
    expect(html).toBe("<h2>A</h2><h4>B</h4><h6>C</h6>");
  });

  it("ignore les paragraphes vides de l'éditeur", () => {
    expect(
      render([
        { type: "paragraph", children: [text("  ")] },
        { type: "paragraph", children: [text("Bonjour")] },
      ]),
    ).toBe("<p>Bonjour</p>");
  });

  it("applique les styles de texte et les retours à la ligne", () => {
    const html = render([{ type: "paragraph", children: [text("a", { bold: true, italic: true }), text("x\ny")] }]);
    expect(html).toBe("<p><em><strong>a</strong></em>x<br/>y</p>");
  });

  it("ouvre les liens externes dans un nouvel onglet avec un titre explicite", () => {
    const html = render([{ type: "paragraph", children: [{ type: "link", url: "https://example.org", children: [text("Un site")] }] }]);
    expect(html).toContain('href="https://example.org" target="_blank" rel="noopener noreferrer" title="Un site - nouvelle fenêtre"');
  });

  it("rend les liens internes avec le routeur et les liens mailto tels quels", () => {
    const html = render([
      {
        type: "paragraph",
        children: [
          { type: "link", url: "/missions", children: [text("interne")] },
          { type: "link", url: "mailto:a@b.fr", children: [text("mail")] },
        ],
      },
    ]);
    expect(html).toContain('<a href="/missions" data-discover="true">interne</a>');
    expect(html).toContain('<a href="mailto:a@b.fr">mail</a>');
  });

  it("retire les liens dangereux ou protocol-relative en gardant le texte", () => {
    const html = render([
      {
        type: "paragraph",
        children: [
          { type: "link", url: "javascript:alert(1)", children: [text("js")] },
          { type: "link", url: "//evil.example", children: [text("proto")] },
        ],
      },
    ]);
    expect(html).toBe("<p>jsproto</p>");
  });

  it("rend les listes imbriquées", () => {
    const html = render([
      {
        type: "list",
        format: "ordered",
        children: [{ type: "list-item", children: [text("un"), { type: "list", format: "unordered", children: [{ type: "list-item", children: [text("sous-point")] }] }] }],
      },
    ]);
    expect(html).toBe("<ol><li>un<ul><li>sous-point</li></ul></li></ol>");
  });

  it("rend une image avec alt vide quand aucun texte alternatif n'est renseigné", () => {
    const html = render([{ type: "image", image: { url: "/a.webp", alternativeText: null, width: 10, height: 5 }, children: [text("")] }]);
    expect(html).toContain('alt=""');
  });
});
