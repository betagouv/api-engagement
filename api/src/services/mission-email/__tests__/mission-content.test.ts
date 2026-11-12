import { describe, expect, it } from "vitest";

import { buildAnswersContentHtml, buildListMissionCardsParams, buildSavedMissionContentHtml, type MissionContent } from "@/services/mission-email/mission-content";

const mission = (overrides: Partial<MissionContent> = {}): MissionContent => ({
  id: "mission-1",
  title: "Mission de test",
  imageUrl: "",
  domainLabel: "Santé",
  tags: ["Paris", "620\u00a0€ par mois"],
  publisherLogo: "https://example.com/logo.png",
  publisherName: "Éditeur",
  url: "https://example.com/missions/mission-1",
  ...overrides,
});

describe("buildSavedMissionContentHtml", () => {
  it("affiche l'image sans surimpression et le tag domaine sous l'image", () => {
    const html = buildSavedMissionContentHtml(mission({ imageUrl: "https://example.com/image.png" }));

    expect(html).toContain('<img src="https://images.weserv.nl/?url=https%3A%2F%2Fexample.com%2Fimage.png&w=1068&h=400&fit=cover"');
    expect(html).not.toContain("background-image");
    expect(html.indexOf(">Santé</span>")).toBeGreaterThan(html.indexOf("<img"));
  });

  it("affiche le titre en bleu France et les tags gris, sans lien « Détails »", () => {
    const html = buildSavedMissionContentHtml(mission());

    expect(html).toMatch(/color: #000091;">Mission de test<\/div>/);
    expect(html).toContain('background: #eeeeee; color: #161616;">Paris</span>');
    expect(html).toContain(">620\u00a0€ par mois</span>");
    expect(html).not.toContain("Détails");
  });

  it("n'affiche ni logo ni nom sans annonceur", () => {
    const html = buildSavedMissionContentHtml(mission({ publisherName: "" }));

    expect(html).not.toContain("example.com%2Flogo.png");
  });

  it("encode les champs textuels et empêche la détection de lien sur le nom de l'annonceur", () => {
    const html = buildSavedMissionContentHtml(mission({ title: "{{7*7}} <b>", tags: ["<i>"], publisherName: "JeVeuxAider.gouv.fr" }));

    expect(html).toContain("&#123;&#123;7*7&#125;&#125; &lt;b&gt;");
    expect(html).toContain("&lt;i&gt;");
    expect(html).toContain("JeVeuxAider.&#8204;gouv.&#8204;fr");
  });
});

describe("buildListMissionCardsParams", () => {
  it("envoie une carte par case de la grille, de mission1 à missionN", () => {
    const params = buildListMissionCardsParams([mission({ title: "Première" }), mission({ title: "Deuxième" })]);

    expect(Object.keys(params)).toEqual(["mission1", "mission2"]);
    expect(params.mission1).toContain(">Première</div>");
    expect(params.mission2).toContain(">Deuxième</div>");
  });

  it("donne la même hauteur à toutes les cartes, quel que soit le contenu", () => {
    const { mission1, mission2 } = buildListMissionCardsParams([mission({ domainLabel: "", tags: [], publisherName: "" }), mission({ title: "Titre ".repeat(30) })]);
    const fixedHeights = (html: string) => html.match(/<td height="\d+"/g);

    expect(fixedHeights(mission1)).toEqual(fixedHeights(mission2));
    expect(mission1).toContain("table-layout: fixed;");
  });

  it("affiche les tags et le lien « Détails » souligné vers la mission", () => {
    const { mission1 } = buildListMissionCardsParams([mission()]);

    expect(mission1).toContain(">Paris</span>");
    expect(mission1).toContain('<a href="https://example.com/missions/mission-1"');
    expect(mission1).toContain('text-decoration: underline;">Détails&nbsp;&rarr;</a>');
  });
});

describe("buildAnswersContentHtml", () => {
  it("affiche une puce par réponse, texte encodé", () => {
    const html = buildAnswersContentHtml(["“Sport”, “Numérique”", "{{ contact.EMAIL }} <b>"]);

    expect(html).toContain("Tu nous as dit :");
    expect(html.match(/&bull;/g)).toHaveLength(2);
    expect(html).toContain(">“Sport”, “Numérique”</td>");
    expect(html).toContain("&#123;&#123; contact.EMAIL &#125;&#125; &lt;b&gt;");
  });

  it("n'affiche rien sans réponse", () => {
    expect(buildAnswersContentHtml([])).toBe("");
  });
});
