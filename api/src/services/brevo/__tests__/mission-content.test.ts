import { describe, expect, it } from "vitest";

import { buildMissionContentHtml } from "@/services/brevo/mission-content";
import type { MissionContent } from "@/services/brevo/mission-content";

const mission = (overrides: Partial<MissionContent> = {}): MissionContent => ({
  id: "mission-1",
  title: "Mission de test",
  imageUrl: "",
  durationLabel: "6 mois",
  startAtLabel: "à partir du 1 janvier",
  compensationLabel: "620€ par mois",
  publisherLogo: "https://example.com/logo.png",
  publisherName: "Éditeur",
  publisherOrganizationName: "Organisation",
  city: "Paris",
  url: "https://example.com/missions/mission-1",
  ...overrides,
});

describe("buildMissionContentHtml", () => {
  it("neutralise le langage de template Brevo dans les champs textuels", () => {
    const html = buildMissionContentHtml([
      mission({
        title: "{{7*7}}",
        publisherName: "{% autoescape off %}",
        publisherOrganizationName: "{{ contact.EMAIL }}",
        city: "{% if contact %}Paris{% endif %}",
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
        publisherOrganizationName: "Aide & solidarite",
        city: "Paris <centre>",
      }),
    ]);

    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("Éditeur &quot;frauduleux&quot;");
    expect(html).toContain("Aide &amp; solidarite");
    expect(html).toContain("Paris &lt;centre&gt;");
  });
});
