import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import InlineText from "../inline-text";

const render = (props: Parameters<typeof InlineText>[0]) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(InlineText, props)));

describe("InlineText", () => {
  it("rend le texte brut échappé, sans HTML", () => {
    expect(render({ text: "<b>gras</b> & co" })).toBe("&lt;b&gt;gras&lt;/b&gt; &amp; co");
  });

  it("surligne ==mot== avec la classe demandée", () => {
    const html = render({ text: "Chaque ==geste compte==", highlightClassName: "bg-x" });
    expect(html).toContain("Chaque ");
    expect(html).toContain('class="absolute inset-x-0 top-[55%] bottom-[5%] rounded-md bg-x"');
    expect(html).toContain("geste compte");
  });

  it("rend [libellé](/chemin) en lien", () => {
    expect(render({ text: "Voir [le site](/missions) ici" })).toContain('<a class="fr-link" href="/missions" data-discover="true">le site</a>');
  });

  it("transforme les retours à la ligne en <br>, avec la classe demandée", () => {
    expect(render({ text: "a\nb" })).toBe("a <br/>b");
    expect(render({ text: "a\nb", breakClassName: "hidden md:block" })).toContain('<br class="hidden md:block"/>');
  });
});
