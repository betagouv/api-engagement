import { describe, expect, it } from "vitest";

import { sanitizeDescriptionHtml } from "~/services/api/sanitize";

describe("sanitizeDescriptionHtml", () => {
  it("conserve les balises de contenu autorisées", () => {
    const html = "<p>Une <strong>mission</strong> de <em>bénévolat</em></p><ul><li>Aider</li><li>Accompagner</li></ul>";
    expect(sanitizeDescriptionHtml(html)).toBe(html);
  });

  it("supprime les balises de titre en conservant leur texte", () => {
    expect(sanitizeDescriptionHtml("<h1>Titre</h1><p>Texte</p>")).toBe("Titre<p>Texte</p>");
  });

  it("supprime les scripts et styles avec leur contenu", () => {
    expect(sanitizeDescriptionHtml('<p>ok</p><script>alert("xss")</script><style>p{color:red}</style>')).toBe("<p>ok</p>");
  });

  it("supprime les attributs id, class, style et les handlers", () => {
    expect(sanitizeDescriptionHtml('<p id="dup" class="big" style="color:red" onclick="x()">Texte</p>')).toBe("<p>Texte</p>");
  });

  it("ne garde que href sur les liens et filtre les schémas dangereux", () => {
    expect(sanitizeDescriptionHtml('<a href="https://example.org" target="_blank" rel="noopener">Lien</a>')).toBe('<a href="https://example.org">Lien</a>');
    expect(sanitizeDescriptionHtml('<a href="javascript:alert(1)">Lien</a>')).toBe("<a>Lien</a>");
  });

  it("referme les balises non fermées", () => {
    expect(sanitizeDescriptionHtml("<p>Un <strong>texte<p>Suite")).toBe("<p>Un <strong>texte<p>Suite</p></strong></p>");
  });
});
