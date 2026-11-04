import { describe, expect, it } from "vitest";

import { buildAnswersContentHtml, buildListMissionCardsParams, buildSavedMissionContentHtml, type MissionContent } from "@/services/mission-email/mission-content";

const mission = (overrides: Partial<MissionContent> = {}): MissionContent => ({
  id: "mission-1",
  title: "Mission de test",
  imageUrl: "",
  domainLabel: "Santé",
  location: "Paris",
  schedule: "",
  compensation: "620€ par mois",
  publisherLogo: "https://example.com/logo.png",
  publisherName: "Éditeur",
  url: "https://example.com/missions/mission-1",
  ...overrides,
});

describe("buildSavedMissionContentHtml", () => {
  it("pose le tag domaine sur l'image de la mission", () => {
    const html = buildSavedMissionContentHtml(mission({ imageUrl: "https://example.com/image.png" }));

    expect(html).toContain("background-image: url('https://images.weserv.nl/?url=https%3A%2F%2Fexample.com%2Fimage.png&w=1200&h=448&fit=cover')");
    expect(html).toContain(">Santé</span></td>");
  });

  it("n'affiche que les infos renseignées, sans lien « Détails »", () => {
    const html = buildSavedMissionContentHtml(mission());

    expect(html).toContain(">Paris</span>");
    expect(html).toContain(">620€ par mois</span>");
    expect(html.match(/width="16" height="16"/g)).toHaveLength(2);
    expect(html).not.toContain("Détails");
  });

  it("encode les champs textuels et empêche la détection de lien sur le nom de l'annonceur", () => {
    const html = buildSavedMissionContentHtml(mission({ title: "{{7*7}} <b>", publisherName: "JeVeuxAider.gouv.fr" }));

    expect(html).toContain("&#123;&#123;7*7&#125;&#125; &lt;b&gt;");
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

  it("affiche une info par ligne et le lien vers la mission", () => {
    const { mission1 } = buildListMissionCardsParams([mission()]);

    expect(mission1).toContain(">Paris</span></div>");
    expect(mission1).toContain(">620€ par mois</span></div>");
    expect(mission1.match(/width="16" height="16"/g)).toHaveLength(2);
    expect(mission1).toContain('<a href="https://example.com/missions/mission-1"');
    expect(mission1).toContain("Voir la mission&nbsp;&rarr;");
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
