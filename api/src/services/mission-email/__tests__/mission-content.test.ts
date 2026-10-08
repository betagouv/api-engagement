import { describe, expect, it } from "vitest";

import { buildMissionContentHtml, type MissionContent } from "@/services/mission-email/mission-content";

const mission = (overrides: Partial<MissionContent> = {}): MissionContent => ({
  id: "mission-1",
  title: "Mission de test",
  imageUrl: "",
  domainLabel: "Santé",
  tags: ["Paris", "620€ par mois"],
  publisherLogo: "https://example.com/logo.png",
  publisherName: "Éditeur",
  url: "https://example.com/missions/mission-1",
  ...overrides,
});

describe("buildMissionContentHtml", () => {
  it("neutralise le langage de template Brevo dans les champs textuels", () => {
    const html = buildMissionContentHtml([
      mission({
        title: "{{7*7}}",
        publisherName: "{% autoescape off %}",
        domainLabel: "{{ contact.EMAIL }}",
        tags: ["{% if contact %}Paris{% endif %}"],
      }),
    ]);

    expect(html).not.toContain("{{");
    expect(html).not.toContain("}}");
    expect(html).not.toContain("{%");
    expect(html).not.toContain("%}");
    expect(html).toContain("&#123;&#123;7*7&#125;&#125;");
  });

  it("encode le HTML dans les champs textuels", () => {
    const html = buildMissionContentHtml([
      mission({
        title: '<img src=x onerror="alert(1)">',
        publisherName: 'Éditeur "frauduleux"',
        domainLabel: "Aide & solidarite",
        tags: ["Paris <centre>"],
      }),
    ]);

    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("Éditeur &quot;frauduleux&quot;");
    expect(html).toContain("Aide &amp; solidarite");
    expect(html).toContain("Paris &lt;centre&gt;");
  });

  it("tronque les tags trop longs pour ne pas élargir la carte", () => {
    const html = buildMissionContentHtml([mission({ tags: ["Environ 50 jours par an. Contrat de 1 à 5 ans, renouvelable.", "Mercredi après-midi. 60 jours/an."] })]);

    expect(html).toContain(">Environ 50 jours par an. Contrat d…</span>");
    expect(html).toContain(">Mercredi après-midi. 60 jours/an.</span>");
  });

  it("affiche les missions en grille de 2 cartes par ligne", () => {
    const html = buildMissionContentHtml([mission({ id: "1" }), mission({ id: "2" }), mission({ id: "3" })]);

    expect(html.match(/<td width="50%"/g)).toHaveLength(4);
    expect(html.match(/Détails&nbsp;&rarr;/g)).toHaveLength(3);
  });
});
